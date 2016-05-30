const Bus = require('../../lib/bluesense-superhub/messaging/bus');
const Message = require('../../lib/bluesense-superhub/models/message');
const WebSocket = require('../../lib/bluesense-superhub/messaging/websocket');
const Config = require('../../lib/bluesense-superhub/config');
const Logger = require('../../lib/bluesense-superhub/logger');

describe('Router', function() {
  beforeEach(function() {
    this.sandbox = sinon.sandbox.create();
    this.sandbox.useFakeTimers();

    this.busMock = this.sandbox.mock(Bus.prototype);
    this.webSocketMock = this.sandbox.mock(WebSocket.prototype);
    this.loggerStub = this.sandbox.mock(Logger.prototype);
    this.configMock = this.sandbox.mock(Config);

    this.Router = proxyquire('../../lib/bluesense-superhub/router', {
      './messaging/bus': {
        create: () => this.busMock.object
      },
      './messaging/websocket': {
        connect: () => this.webSocketMock.object
      },
      './logger': this.loggerStub.object,
      './config': this.configMock.object
    });

    this.router = this.Router.create();
  });

  afterEach(function() {
    this.busMock.object.removeAllListeners();
    this.webSocketMock.object.removeAllListeners();
    this.sandbox.restore();
  });

  describe('message broker event handling', function() {
    beforeEach(function() {
      this.message = new Message('DeviceDiscovered', {});
    });

    it('should forward all messages from the bus to the backend via websockets', function() {
      this.webSocketMock.expects('send').withArgs(this.message);

      this.busMock.object.emit('message', this.message);

      this.webSocketMock.verify();
    });
  });

  describe('websocket message handling', function() {
    beforeEach(function() {
      this.message = new Message('DeviceDiscovered', {});
    });

    it('should forward all messages from the websocket connection to the bus', function() {
      this.busMock.expects('publish').withArgs(new Message(this.message.type, this.message.data));

      this.webSocketMock.object.emit('message', this.message);

      this.busMock.verify();
    });
  });

  describe('websocket event handling', function() {
    describe('connect', function() {
      context('current state: disconnected', function() {
        it('should notify listeners that the platform is connected', function() {
          this.busMock.expects('publish').withArgs(new Message(Message.type.connectedToPlatform));

          this.webSocketMock.object.emit('connect');

          this.busMock.verify();
        });
      });

      context('current state: connected', function() {
        beforeEach(function() {
          this.router._connected = true;
        });

        it('should not publish the event', function() {
          this.busMock.expects('publish').never();

          this.webSocketMock.object.emit('connect');

          this.busMock.verify();
        });
      });
    });

    context('disconnect', function() {
      context('current state: connected', function() {
        beforeEach(function() {
          this.router._connected = true;
        });

        it('should notify listeners that the platform has disconnected', function() {
          this.busMock.expects('publish').withArgs(new Message(Message.type.disconnectedFromPlatform));

          this.webSocketMock.object.emit('disconnect');

          this.busMock.verify();
        });
      });

      context('current state: disconnected', function() {
        it('should not publish the event', function() {
          this.busMock.expects('publish').never();

          this.webSocketMock.object.emit('disconnect');

          this.busMock.verify();
        });
      });
    });
  });
});
