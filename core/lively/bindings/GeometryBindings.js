module('lively.bindings.GeometryBindings').requires('cop.Layers', 'lively.morphic.Core', 'lively.bindings.Core', 'lively.morphic.TextCore', 'lively.morphic.Widgets').toRun(function() {

AttributeConnection.subclass('lively.morphic.GeometryConnection',
'dependents', {
    addDependConnection: function(c) {
        c.dependedBy = this;
        if (!this.dependendConnections)
            this.dependendConnections = [];
        this.dependendConnections.pushIfNotIncluded(c)
    },

    removeDependConnection: function(c) {
        c.disconnect();
        if (!this.dependendConnections)
            return;
        this.dependendConnections = this.dependendConnections.without(c);
    },
    clone: function($super) {
        var con = $super();
        if (this.dependendConnections) {
            con.dependendConnections = this.dependendConnections.clone();
        }
        return con;
    }
},
'connecting', {
    ensureExistence: function() {
        // duplication with $super
        var existing = this.getExistingConnection()
        if (existing !== this) {
            // when existing == null just add new connection
            // when existing === this then connect was called twice or we are
            //    in deserialization. Just do nothing then.
            existing && existing.disconnect();
            this.addAttributeConnection();
        }
    },

    connect: function() {
        this.ensureExistence()
        var connectionSpec = Object.mergePropertyInHierarchy(this.sourceObj, 'connections')[this.sourceAttrName],
            path = connectionSpec.map.split("."),
            newSourceAttr = path.pop(),
            newSourceObj = this.sourceObj;

        // resolve the path by walking the attributes
        if (!newSourceAttr) throw new Error(this.constructor.type
                + ' cannot connect from ' + this.sourceAttrName);
        path.forEach(function(ea) {
            newSourceObj = newSourceObj[ea];
            if (!newSourceObj) throw new Error(this.constructor.type
                + ' cannot walk path ' + ea + ' for ' + this);
        })

        var c = lively.bindings.connect(
            newSourceObj, newSourceAttr, this.targetObj, this.targetMethodName, this.getSpec());
        this.addDependConnection(c);

        lively.bindings.connect(this, 'converterString', c, 'setConverter');
        lively.bindings.connect(this, 'updaterString', c, 'setUpdater');
        lively.bindings.connect(this, 'varMapping', c, 'varMapping');

        return this;
    },

    disconnect: function($super) {
        $super();
        if (!this.dependendConnections) return;
        var self = this;
        this.dependendConnections.forEach(function(ea) {
            self.removeDependConnection(ea);
        })
    }

});


lively.morphic.GeometryConnection.subclass('lively.morphic.GeometryTransformConnection',
'connecting', {

    signalTarget: function() {
        var trans = this.sourceObj.getGlobalTransform()
        if (String(trans) == String(this.oldTransform)) return;
        this.update(trans, this.oldTransform);
        this.oldTransform = trans;
        // alert('signal target ' + this.targetObj + "->" + this.targetMethodName)
    },

    startObserveTransformationIn: function(morph) {
        this.addDependConnection(
            connect(morph, '_Position', this, 'signalTarget'));
        this.addDependConnection(
            connect(morph, '_Scale', this, 'signalTarget'));
        this.addDependConnection(
            connect(morph, '_Rotation', this, 'signalTarget'));

        // Meta
        this.addDependConnection(
            connect(morph, 'owner', this, 'updateOwners', {
                converter: function(newOwner, oldOwner) {
                    return [newOwner, oldOwner]
                }}));
    },

    stopObserveTransformationIn: function(morph) {
        if (!morph.attributeConnections) return;
        var self = this;
        morph.attributeConnections
            .select(function(ea) {return ea.dependedBy === self})
            .each(function(ea) {self.removeDependConnection(ea)})
    },


    withAllOwnersDo: function(startMorph,func) {
        if (!startMorph) return;
        var world = startMorph.world();
        for (var m = startMorph; (m != world) && (m != undefined); m = m.owner) {
            func(m)
        }
    },

    updateOwners: function(oldAndNewOwnerPair) {
        var world = this.sourceObj.world();
        var self = this;
        // alert("disconnect old owner" +     oldAndNewOwnerPair[1])
        var oldOwner = oldAndNewOwnerPair[1];
        var newOwner = oldAndNewOwnerPair[0];

        if (oldOwner === newOwner) return;

        this.withAllOwnersDo(oldOwner, function(ea) {
            // alert("disconnect " + ea)
            self.stopObserveTransformationIn(ea)
        })

        //alert("connect new owner" +     oldAndNewOwnerPair[0])
        this.withAllOwnersDo(newOwner, function(ea) {
            // alert("connect " + ea)
            self.startObserveTransformationIn(ea)
        })
    },

    connect: function() {
        this.ensureExistence();
        var self = this;
        this.withAllOwnersDo(this.sourceObj, function(ea) {
            self.startObserveTransformationIn(ea)
        })
        return this;
    },

});

lively.morphic.Morph.addMethods(
'bindings', {
    connections: {
        name: {},
        position: { map: '_Position'},
        rotation: { map: '_Rotation'},
        setRotation: {},
        scale: { map: '_Scale'},
        setScale: {},

        borderWidth: { map: 'shape._BorderWidth'},
        borderColor: { map: 'shape._BorderColor'},

        fill: { map: 'shape._Fill'},

        extent: { map: 'shape._Extent'},

        globalTransform: {
            connectionClassType: 'lively.morphic.GeometryTransformConnection'
        }
    }
});

lively.morphic.Text.addMethods(
'bindings', {
    connections: {
        textString: {},
        savedTextString: {}
    }
});

lively.morphic.Button.addMethods(
'bindings', {
    connections: {
        fire: {}
    }
});

}) // end of module
