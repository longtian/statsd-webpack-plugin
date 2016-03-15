var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var os = require('os');

/**
 * 目前只能发送到本机的 OneAPM statsd
 * @param message
 */
var sendToStatsD = function (message) {
  var options = this.options;
  var payload = new Buffer(message);

  if (options.debug) {
    console.log('statsd: %s', message);
  }

  client.send(message, 0, payload.length, options.port, options.host, function (err) {
    if (err) {
      console.error(err);
    }
  });

  client.unref && client.unref();
}


/**
 *
 * @param options
 * @constructor
 */
function StatsDPlugin() {
  // @todo read options
  this.options = {
    port: 8251,
    host: "localhost",
    debug: true,
    app: "oneapm-test"
  };
}

StatsDPlugin.prototype.apply = function (compiler) {
  var self = this;
  var options = this.options;

  compiler.plugin('done', function (stats) {
    try {
      var send = sendToStatsD.bind(self);
      var json = stats.toJson();

      var commonTags = '|#version:' + json.version + ",app:" + options.app;

      // count
      send('webpack.errors.count:' + json.errors.length + '|g' + commonTags);
      send('webpack.warnings.count:' + json.warnings.length + '|g' + commonTags);
      send('webpack.assets.count:' + json.assets.length + '|g' + commonTags);
      send('webpack.chunks.count:' + json.chunks.length + '|g' + commonTags);
      send('webpack.modules.count:' + json.modules.length + '|g' + commonTags);

      // duration
      send('webpack.time.ms:' + json.time + '|g' + commonTags);

      // assets
      json.assets.forEach(function (asset, index) {
        send('webpack.asset.kb_size:' + asset.size + '|g' + commonTags + ",name:" + asset.name);
      });


    } catch (e) {
      console.error(e);
    }

  })
}


module.exports = StatsDPlugin;