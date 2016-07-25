'use strict'

const Pages = require('./handlers/pages')
const Registry = require('./handlers/registry')
const Todos = require('./handlers/todos')
const JSInspect = require('./handlers/jsinspect')

const config = require('./config')

let HomeRoutes = [{
  method: 'GET',
  path: '/',
  handler: Pages.home
}, {
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: '.',
      redirectToSlash: true,
      index: true
    }
  }
}]

let RegistryRoutes = [{
  method: 'GET',
  path: `${config.api.registry.url}/{name}`,
  handler: Registry.getPackage,
  config: {
    description: 'Retrieve a package from the local registry.'
  }
}]

let TodoServiceRoutes = [{
  method: 'GET',
  path: `${config.api.todo.url}/{name}`,
  handler: Todos.getTodos,
  config: {
    description: 'Get all the comment tag matches.'
  }
}]

let JSInspectServiceRoutes = [{
  method: 'GET',
  path: `${config.api.jsinspect.url}/{name}`,
  handler: JSInspect.getMatches,
  config: {
    description: 'Get all the jsinspect matches.'
  }
}]

module.exports = HomeRoutes
                  .concat(require('./api'))
                  .concat(RegistryRoutes)
                  .concat(TodoServiceRoutes)
                  .concat(JSInspectServiceRoutes)
