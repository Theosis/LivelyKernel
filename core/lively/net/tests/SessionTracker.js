module('lively.net.tests.SessionTracker').requires('lively.TestFramework', 'lively.net.SessionTracker').toRun(function() {

AsyncTestCase.subclass('lively.net.tests.SessionTracker.Register',
'running', {
    setUp: function($super) {
        $super();
        this.setMaxWaitDelay(1*1000);
        this.serverURL = URL.create(Config.nodeJSURL+'/SessionTrackerUnitTest/');
        lively.net.SessionTracker.createSessionTrackerServer(this.serverURL, {inactiveSessionRemovalTime: 1*500});
        this.sut = new lively.net.SessionTrackerConnection({
            sessionTrackerURL: this.serverURL,
            username: 'SessionTrackerTestUser'
        });
    },

    tearDown: function($super) {
        $super();
        this.sut.unregister();
        this.sut.resetConnection();
        lively.net.SessionTracker.removeSessionTrackerServer(this.serverURL);
    }
},
'testing', {
    testRegisterCurrentWorld: function() {
        this.sut.register();
        this.sut.getSessions(function(sessions) {
            var expected = [{
                id: this.sut.sessionId,
                worldURL: URL.source.toString(),
                user: "SessionTrackerTestUser"
            }];
            this.assertMatches(expected, sessions.local);
            this.done();
        }.bind(this));
    },

    testUnregister: function() {
        var cameOnline = false;
        this.sut.register();
        this.sut.whenOnline(function() {
            cameOnline = true;
            this.sut.unregister();
        }.bind(this));
        this.waitFor(function() { return cameOnline; }, 100, function() {
            var sessions = lively.net.SessionTracker.getServerStatus()[this.serverURL.pathname];
            this.assertEqualState({local: []}, sessions);
            this.done();
        });
},

    testLostConnectionIsRemoved: function() {
        var cameOnline = false;
        this.sut.register();
        this.sut.whenOnline(function() {
            cameOnline = true;
            disconnectAll(this.sut.webSocket); // so that close does not trigger reconnect
            this.sut.webSocket.close();
        }.bind(this));
        this.waitFor(function() { return cameOnline; }, 100, function() {
            var sessions = lively.net.SessionTracker.getServerStatus()[this.serverURL.pathname];
            this.assertEquals(1, sessions.local.length, 'session removed to early?');
            this.delay(function() {
                var sessions = lively.net.SessionTracker.getServerStatus()[this.serverURL.pathname];
                this.assertEquals(0, sessions.local.length, 'session not removed');
                this.done();
            }, 600);
        });
    },

    testAutoReconnectToRestartedServer: function() {
        var serverDown = false, serverRestarted = false;
        this.assertEquals('disconnected', this.sut.status());
        this.sut.register();
        this.sut.whenOnline(function() {
            this.assert(this.sut.isConnected(), 'session not connected')
            this.assertEquals('connected', this.sut.status());
            lively.net.SessionTracker.removeSessionTrackerServer(this.serverURL);
            serverDown = true;
        }.bind(this));
        this.waitFor(function() { return serverDown; }, 100, function() {
            this.delay(function() {
                this.assertEquals('connecting', this.sut.status());
                lively.net.SessionTracker.createSessionTrackerServer(this.serverURL, {inactiveSessionRemovalTime: 1*500});
                serverRestarted = true;
            }, 200);
        });
        this.waitFor(function() { return serverRestarted; }, 100, function() {
            this.sut.whenOnline(function() {
                var sessions = lively.net.SessionTracker.getServerStatus()[this.serverURL.pathname];
                // this.assertEquals('connected', this.sut.status());
                this.assertEquals(1, sessions.local.length, 'session not re-registered');
                this.done();
            }.bind(this));
        }, 700);
    },

    testRemoteEval: function() {
        this.sut.register();
        this.sut.openForRemoteEvalRequests();
        Global.remoteEvalHappened = false;
        var expr = 'Global.remoteEvalHappened = true; 1 + 3';
        this.sut.remoteEval(this.sut.sessionId, expr, function(result) {
            this.assertMatches({data: {result: '4'}}, result);
            this.assert(Global.remoteEvalHappened, 'remoteEvalHappened no set');
            delete Global.remoteEvalHappened;
            this.done();
        }.bind(this));
    },
    testReportsLastActivity: function() {
        this.sut.activityTimeReportDelay = 50; // ms
        Global.LastEvent = {timeStamp: Date.now()}
        this.sut.register();
        var activity1, activity2;
        this.sut.getSessions(function(sessions) {
            activity1 = sessions.local[0].lastActivity;
            Global.LastEvent.timeStamp++;
        }.bind(this));
        this.delay(function() {
            this.sut.getSessions(function(sessions) {
                activity2 = sessions.local[0].lastActivity;
            }.bind(this));
        }, 200);
        this.delay(function() {
            this.assert(activity1 < activity2, 'Activity not updated ' + activity1 + ' vs ' + activity2);
            this.done();
        }, 300);
    }

});

AsyncTestCase.subclass('lively.net.tests.SessionTracker.SessionFederation',
'running', {
    setUp: function($super) {
        $super();
        this.setMaxWaitDelay(5*1000);
        this.serverURL1 = URL.create(Config.nodeJSURL+'/SessionTrackerFederationTest1/');
        this.serverURL2 = URL.create(Config.nodeJSURL+'/SessionTrackerFederationTest2/');
        lively.net.SessionTracker.createSessionTrackerServer(this.serverURL1);
        lively.net.SessionTracker.createSessionTrackerServer(this.serverURL2);
        this.client1 = new lively.net.SessionTrackerConnection({
            sessionTrackerURL: this.serverURL1, username: 'SessionTrackerTestUser1'});
        this.client2 = new lively.net.SessionTrackerConnection({
            sessionTrackerURL: this.serverURL2, username: 'SessionTrackerTestUser2'});
    },

    tearDown: function($super) {
        $super();
        this.client1.unregister();
        this.client2.unregister();
        lively.net.SessionTracker.removeSessionTrackerServer(this.serverURL1);
        lively.net.SessionTracker.removeSessionTrackerServer(this.serverURL2);
    }
},
'testing', {
    testConnect2Servers: function() {
        var c1 = this.client1, c2 = this.client2;
        c1.register(); c2.register();
        this.waitFor(function() { return c1.isConnected() && c2.isConnected(); }, 50, function() {
            c1.initServerToServerConnect(this.serverURL2);
            connect(c1.webSocket, 'initServerToServerConnectResult', this, 'serverToServerConnectDone');
        });
        this.waitFor(function() { return !!this.serverToServerConnectDone; }, 100, function() {
            c1.getSessions(function(sessions) {
                var remoteSessions = sessions[this.serverURL2.toString().replace(/^http/, 'ws') + 'connect'],
                    expected = [{id: c2.sessionId, worldURL: URL.source.toString(), user: 'SessionTrackerTestUser2'}];
                this.assertMatches(expected, remoteSessions);
                this.done();
            }.bind(this));            
        });
    },

    testRemoteEvalWith2Servers: function() {
        var c1 = this.client1, c2 = this.client2;
        c1.register(); c2.register();
        c2.openForRemoteEvalRequests();
        this.waitFor(function() { return c1.isConnected() && c2.isConnected(); }, 50, function() {
            c1.initServerToServerConnect(this.serverURL2);
            connect(c1.webSocket, 'initServerToServerConnectResult', this, 'serverToServerConnectDone');
        });
        this.waitFor(function() { return !!this.serverToServerConnectDone; }, 100, function() {
            c1.remoteEval(c2.sessionId, '1+2', function(result) {
                this.assertMatches({data: {result: "3"}}, result, 'remote eval result: ' + Objects.inspect(result));
                this.done();
            }.bind(this));
        });
    }

});

}) // end of module