// Mock superjson for Jest tests - provides passthrough serialization
module.exports = {
  serialize: (data) => ({ json: data, meta: undefined }),
  deserialize: (payload) => payload.json || payload,
  stringify: (data) => JSON.stringify(data),
  parse: (str) => JSON.parse(str),
  default: {
    serialize: (data) => ({ json: data, meta: undefined }),
    deserialize: (payload) => payload.json || payload,
    stringify: (data) => JSON.stringify(data),
    parse: (str) => JSON.parse(str),
  },
};
