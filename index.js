var nunjucks = require('nunjucks')
var loaderUtils = require('loader-utils')

function createLoader(searchPaths) {
  return new nunjucks.FileSystemLoader(searchPaths || ['.'])
}

module.exports = function(source) {
  this.cacheable()

  var query = loaderUtils.parseQuery(this.query)

  var opts = query.envOpts || { autoescape: query.autoescape || true }
  var env = new nunjucks.Environment(query.loaders || createLoader(query.searchPaths), opts)

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
