(function() {

    'use strict';

    app.factory('connections', function(coral, fileTransfer, signaling, webrtc, $rootScope) {
        
        var connections = {};

        var returnObject = {
            list: connections,
            get: getConnection,
            connect: getConnectionAndConnect,
            init: function() {
                signaling.init();
                coral.on("presence", presenceHandler);
                coral.subscribe("presence", "all", "");

                signaling.addMessageHandler(offerHandler, "offer");
            }
        };

        function getConnection(id) {
            return connections[id];
        }

        function getConnectionAndConnect(id) {
            var connection = connections[id];
            if (!connection.webrtcConnection) {
                connection.connect();
            }
            return connection;

        }

        function setOnlineStatus(listOfOnlineIds) {
            for (var id in connections) {
                if (listOfOnlineIds[id]) {
                    connections[id].online = true;
                }
                else {
                    connections[id].online = false;
                }
            }
        }

        function presenceHandler(data) {
            var currentUser;
            var listOfOnlineUsers = data.presence;
            var listOfOnlineIds = {};
            for (var i in listOfOnlineUsers) {
                currentUser = listOfOnlineUsers[i];
                listOfOnlineIds[currentUser.id] = true;

                if (!connections[currentUser.id]) {
                    var connection = createAndAddConnection(currentUser.id);
                    connection.name = currentUser.name;
                }
            }
            $rootScope.$apply(function() {
                setOnlineStatus(listOfOnlineIds);
            });
        }


        function offerHandler(from, offer) {
            var connection = getConnection(from);
            console.log(from);
            console.log(connection);
            console.log(connections);
            if (connection) {
                connection.connect(offer);
            }
            else {
                console.log("Received unwanted offer");
            }
        }

        function createAndAddConnection(id) {
            var connection = createConnection(id);
            addConnection(id, connection);
            return connection;
        }

        function addConnection(id, connection) {
            if (connections[id]) {
                return console.error("cannot add connection, id already exists");
            }

            connections[id] = connection;
        }

        function createConnection(id) {

            var transfer = fileTransfer.newTransfer();
            var connection = createConnectionObject(id, transfer);

            transfer.setSender(function(message, callback) {
                connection.sendFileMessage(message);
            });

            return connection;
        }

        function createConnectionObject(id, transfer) {
            var connectionObject = {
                online: false,
                webrtcConnection: null,
                id: id,
                name: null,
                connect: function(offer) {
                    this.webrtcConnection = webrtc.connect(id, offer);
                    var receiver = createReceiver(id);
                    this.webrtcConnection.setReceiver(receiver);
                },
                transfer: transfer,
                sendData: function(data) {
                    if (this.webrtcConnection) {
                        this.webrtcConnection.send(data);
                    }
                    else {
                        console.error("Cannot send. No webrtc connection available");
                    }
                },
                sendMessage: function(message) {
                    var messageObject = {
                        type: "message",
                        message: message,
                    };
                    this.sendData(messageObject);
                },
                sendFileMessage: function(fileMessage) {
                    var fileMessageObject = {
                        type: "file",
                        message: fileMessage,
                    };
                    this.sendData(fileMessageObject);
                },
                sendFile: function(file) {
                    this.transfer.sendFile(file);
                }
            };

            return connectionObject;
        }

        function createReceiver(id) {
            return function (message) {
                console.log(message);
            }
        }

        return returnObject;
    });
})();
