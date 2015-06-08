/**
 *  Command Manager
**/

Graffeine.command = (function(G) { 

    registerReceivers();

    function send(command, data) { 
        G.socket().emit(command, data);
    };

    function recv(command, callback, visualUpdate) { 
        //console.log("recv: registering \"%s\" callback", command);
        var visualUpdate = (visualUpdate===undefined) ? false : true;
        G.socket().on(command, function(data) { 
            // @todo find a way to make this cleaner
            // if(visualUpdate) send('graph-stats', {});
            callback(data);
        });
    };

    function connectNodes(sourceNode, targetNode, name) { 
        if(!sourceNode||!sourceNode.id||!targetNode||!targetNode.id||!name) { 
            console.warn("connectNodes: can't join nodes %s to %s with %s", sourceNode, targetNode, name);
            return;
        }
        send('node-join', { source: sourceNode.id, target: targetNode.id, name: name });
    };

    function graphFetch(data) { 
        send('graph-fetch', data);
    };

    function registerReceivers() { 

        var ui = Graffeine.ui;
        var util = Graffeine.util;

        console.log("command: registerReceivers");

        G.init(); // open the socket first

        recv("data-nodes", function (data) { 
            var newVis = ($('#graph-mode').text() === "replace") ? 'replace' : 'update';
            graph.updateMode = newVis;
            graph.addGraphData(data);
            graph.refresh();
            $('#graph-root').text(data.root||0);
        });

        /**
         *  Node labels
         *  @todo: refactor out and include in general node data
         *  untested in Jasmine
        **/

        recv('node-labels', function (data) { 
            util.debug("(node-labels) processing: " + JSON.stringify(data));
            graph.data.nodes[data.id].addLabels(data.labels);
            graph.refresh();
        });

        // join nodes

        recv("node-join", function (data) { 
            graph.addPath(data.source, data.target, data.name);
            graph.refresh();
        }, true);

        // stats - node count

        recv('nodes-count', function (data) { 
            util.debug("(nodes-count) processing");
            Graffeine.ui.graphStats.update('nodeCount', data.count);
        });

        // stats - path count

        recv('path-count', function (data) { 
            util.debug("(path-count) processing");
            Graffeine.ui.graphStats.update('pathCount', data.count);
        });

        // delete existing node

        recv('node-delete', function (data) { 
            util.debug("(node-delete) processing");
            graph.removeNode(data.id);
            graph.refresh();
        }, true);

        /**
         *  New node
        **/

        recv("node-add", function (data) { 
            console.log("(node-add) processing -->");
            console.log(data);
            graph.addNode(data.node);
            graph.refresh();
        }, true);

        /**
         *  Update node
        **/

        recv("node-update", function (data) { 
            console.log("(node-update) processing -->");
            console.log(data);
            graph.addNode(data.data);
            graph.resetPaths();
            graph.refresh();
        }, false);

        /**
         *  Delete path
        **/

        recv("path-delete", function (data) { 
            util.debug("(path-delete) processing");
            graph.removePath(data.source, data.target, data.name);
            graph.refresh();
        }, true);

        /**
         *  handle server-side messages (errors, alerts, warnings)
        **/

        recv('server-message', function (data) { 
            var alertClass = (data.category==="error") ? "alert-danger" : "";
            var container = $("<div>")
                .addClass("alert alert-dismissible " + alertClass)
                .attr("role", "alert");
            var closeButton = $("<button>")
                .attr("type", "button")
                .addClass("close")
                .attr("data-dismiss", "alert")
                .attr("aria-label", "close");
            var span = $("<span>")
                .attr("aria-hidden", "true")
                .html("&times;");
            var title = $("<h5>").html();
            closeButton.append(span);
            container.append(closeButton);
            container.append("<strong>"+data.title+": </strong>"+data.message);
            if($("#flash").length===0) util.warning("warning: no flash for server message");
            $("#flash").append(container);
        });

    }

    return { 
        send: send,
        connectNodes: connectNodes
    };

}(Graffeine));