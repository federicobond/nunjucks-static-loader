var nunjucks = require('nunjucks')
var loaderUtils = require('loader-utils')

// define a WebpackLoader that wraps a Nunjuck loader and tracks dependencies
function WebpackLoader(loader, nunjucksLoader) {
  this.loader = loader
  this.nunjucksLoader = nunjucksLoader
}

WebpackLoader.prototype.getSource = function(name) {
  var source = this.nunjucksLoader.getSource(name)
  if (source) {
    this.loader.addDependency(source.path)
  }
  return source
}

// wrap all nunjucks loaders in our WebpackLoader
function prepareLoaders(webpackLoader, loaders) {
  if (!loaders) {
    loaders = [new nunjucks.FileSystemLoader(['.'])]
  }

  return loaders.map(function(loader) {
    return new WebpackLoader(webpackLoader, loader)
  })
}

module.exports = function(source) {
  this.cacheable()

  var query = loaderUtils.parseQuery(this.query)

  var opts = query.envOpts || { autoescape: query.autoescape || true }
  var env = new nunjucks.Environment(
    prepareLoaders(this, query.loaders), opts)

  // configure filter to collect all required assets
  var dependencies = []
  env.addFilter('require', function(path) {
    var id = dependencies.length
    dependencies.push({ id: id, path: path })
    return '__requiredAsset' + id
  })

  // render nunjucks template
  var context = query.context || {}
  var rendered = env.renderString(source, context)

  // import all assets required
  var value = ''
  for (var i = 0; i < dependencies.length; i++) {
    var dependency = dependencies[i]
    value += 'var __requiredAsset' + dependency.id + ' = require("' + dependency.path + '")\n'
  }
  
  // replace asset placeholders with the actual asset
  rendered = JSON.stringify(rendered).replace(
    /__requiredAsset\d+/,
    function(match) { return '" + ' + match + ' + "' }
  )

  value += 'module.exports = ' + rendered
  return value
}
