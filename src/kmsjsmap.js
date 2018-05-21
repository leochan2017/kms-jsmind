var $conTextMenu = '';

// an noop function define
var _noop = function() {};

// 河蟹IE8 时 没有Object.keys方法
if (!Object.keys) {
  Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
      hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
      dontEnums = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'
      ],
      dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [],
        prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

$(function() {
  var html = '<div id="kmsjsmap_contextmenu"><ul class="sui-dropdown-menu"><li><a href="javascript: kmsjsmap.add_node();">添加节点</a></li><li><a href="javascript: kmsjsmap.modify_node()">编辑节点</a></li><li><a href="javascript: kmsjsmap.del_node()">删除节点</a></li><li><a href="javascript: kmsjsmap.relation_node()">关联节点</a></li></ul></div>';

  $('body').append(html);

  $conTextMenu = $('div#kmsjsmap_contextmenu');
});


/*
 * Released under BSD License
 * Copyright (c) 2014-2015 hizzgdev@163.com
 *
 * Project Home:
 *   https://github.com/hizzgdev/jsmind/
 */
(function($w) {
  'use strict';
  // set 'jsMind' as the library name.
  // __name__ should be a const value, Never try to change it easily.
  var __name__ = 'jsMind';
  // library version
  var __version__ = '0.4.6';
  // author
  var __author__ = 'leochan2017@gmail.com';

  var logger = (typeof console === 'undefined') ? {
    log: _noop,
    debug: _noop,
    error: _noop,
    warn: _noop,
    info: _noop
  } : console;

  // check global variables
  if (typeof module === 'undefined' || !module.exports) {
    if (typeof $w[__name__] != 'undefined') {
      logger.log(__name__ + ' has been already exist.');
      return;
    }
  }

  // shortcut of methods in dom
  var $d = $w.document;
  var $g = function(id) { return $d.getElementById(id); };
  var $c = function(tag) { return $d.createElement(tag); };
  var $t = function(n, t) { if (n.hasChildNodes()) { n.firstChild.nodeValue = t; } else { n.appendChild($d.createTextNode(t)); } };
  var $h = function(n, t) { n.innerHTML = t; };
  // detect isElement
  var $i = function(el) { return !!el && (typeof el === 'object') && (el.nodeType === 1) && (typeof el.style === 'object') && (typeof el.ownerDocument === 'object'); };
  if (typeof String.prototype.startsWith != 'function') { String.prototype.startsWith = function(p) { return this.slice(0, p.length) === p; }; }

  var DEFAULT_OPTIONS = {
    container: '', // id of the container
    editable: false, // you can change it in your options
    theme: null,
    mode: 'full', // full or side
    support_html: true,

    view: {
      hmargin: 100,
      vmargin: 50,
      line_width: 2,
      line_color: '#555'
    },
    layout: {
      hspace: 30,
      vspace: 20,
      pspace: 13
    },
    default_event_handle: {
      enable_mousedown_handle: true,
      enable_click_handle: true,
      enable_dblclick_handle: true
    },
    shortcut: {
      enable: true,
      handles: {},
      mapping: {
        addchild: 45, // Insert
        addbrother: 13, // Enter
        editnode: 113, // F2
        delnode: 46, // Delete
        toggle: 32, // Space
        left: 37, // Left
        up: 38, // Up
        right: 39, // Right
        down: 40, // Down
      }
    },
  };

  // core object
  var jm = function(options) {
    jm.current = this;

    this.version = __version__;
    var opts = {};
    jm.util.json.merge(opts, DEFAULT_OPTIONS);
    jm.util.json.merge(opts, options);

    if (!opts.container) {
      logger.error('the options.container should not be null or empty.');
      return;
    }
    this.options = opts;
    this.inited = false;
    this.mind = null;
    this.event_handles = [];
    this.init();
  };

  // ============= static object =============================================
  jm.direction = { left: -1, center: 0, right: 1 };
  jm.event_type = { show: 1, resize: 2, edit: 3, select: 4 };

  jm.node = function(sId, iIndex, sTopic, oData, bIsRoot, oParent, eDirection, bExpanded) {
    if (!sId) { logger.error('invalid nodeid'); return; }
    if (typeof iIndex != 'number') { logger.error('invalid node index'); return; }
    if (typeof bExpanded === 'undefined') { bExpanded = true; }
    this.id = sId;
    this.index = iIndex;
    this.topic = sTopic;
    this.data = oData || {};
    this.isroot = bIsRoot;
    this.parent = oParent;
    this.direction = eDirection;
    this.expanded = !!bExpanded;
    this.children = [];
    this._data = {};
  };

  jm.node.compare = function(node1, node2) {
    // '-1' is alwary the last
    var r = 0;
    var i1 = node1.index;
    var i2 = node2.index;
    if (i1 >= 0 && i2 >= 0) {
      r = i1 - i2;
    } else if (i1 == -1 && i2 == -1) {
      r = 0;
    } else if (i1 == -1) {
      r = 1;
    } else if (i2 == -1) {
      r = -1;
    } else {
      r = 0;
    }
    //logger.debug(i1+' <> '+i2+'  =  '+r);
    return r;
  };

  jm.node.inherited = function(pnode, node) {
    if (!!pnode && !!node) {
      if (pnode.id === node.id) {
        return true;
      }
      if (pnode.isroot) {
        return true;
      }
      var pid = pnode.id;
      var p = node;
      while (!p.isroot) {
        p = p.parent;
        if (p.id === pid) {
          return true;
        }
      }
    }
    return false;
  };

  jm.node.prototype = {
    get_location: function() {
      var vd = this._data.view;
      return {
        x: vd.abs_x,
        y: vd.abs_y
      };
    },
    get_size: function() {
      var vd = this._data.view;
      return {
        w: vd.width,
        h: vd.height
      }
    }
  };


  jm.mind = function() {
    this.name = null;
    this.author = null;
    this.version = null;
    this.root = null;
    this.selected = null;
    this.nodes = {};
  };

  jm.mind.prototype = {
    get_node: function(nodeid) {
      if (nodeid in this.nodes) {
        return this.nodes[nodeid];
      } else {
        logger.warn('the node[id=' + nodeid + '] can not be found');
        return null;
      }
    },

    set_root: function(nodeid, topic, data) {
      if (this.root == null) {
        this.root = new jm.node(nodeid, 0, topic, data, true);
        this._put_node(this.root);
      } else {
        logger.error('root node is already exist');
      }
    },

    add_node: function(parent_node, nodeid, topic, data, idx, direction, expanded) {
      if (!jm.util.is_node(parent_node)) {
        var the_parent_node = this.get_node(parent_node);
        if (!the_parent_node) {
          logger.error('the parent_node[id=' + parent_node + '] can not be found.');
          return null;
        } else {
          return this.add_node(the_parent_node, nodeid, topic, data, idx, direction, expanded);
        }
      }
      var nodeindex = idx || -1;
      var node = null;
      if (parent_node.isroot) {
        var d = jm.direction.right;
        if (!direction || isNaN(direction)) {
          var children = parent_node.children;
          var children_len = children.length;
          var r = 0;
          for (var i = 0; i < children_len; i++) { if (children[i].direction === jm.direction.left) { r--; } else { r++; } }
          d = (children_len > 1 && r > 0) ? jm.direction.left : jm.direction.right;
        } else {
          d = (direction != jm.direction.left) ? jm.direction.right : jm.direction.left;
        }
        node = new jm.node(nodeid, nodeindex, topic, data, false, parent_node, d, expanded);
      } else {
        node = new jm.node(nodeid, nodeindex, topic, data, false, parent_node, parent_node.direction, expanded);
      }
      if (this._put_node(node)) {
        parent_node.children.push(node);
        this._reindex(parent_node);
      } else {
        logger.error('fail, the nodeid \'' + node.id + '\' has been already exist.');
        node = null;
      }
      return node;
    },

    insert_node_before: function(node_before, nodeid, topic, data) {
      if (!jm.util.is_node(node_before)) {
        var the_node_before = this.get_node(node_before);
        if (!the_node_before) {
          logger.error('the node_before[id=' + node_before + '] can not be found.');
          return null;
        } else {
          return this.insert_node_before(the_node_before, nodeid, topic, data);
        }
      }
      var node_index = node_before.index - 0.5;
      return this.add_node(node_before.parent, nodeid, topic, data, node_index);
    },

    get_node_before: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return null;
        } else {
          return this.get_node_before(the_node);
        }
      }
      if (node.isroot) { return null; }
      var idx = node.index - 2;
      if (idx >= 0) {
        return node.parent.children[idx];
      } else {
        return null;
      }
    },

    insert_node_after: function(node_after, nodeid, topic, data) {
      if (!jm.util.is_node(node_after)) {
        var the_node_after = this.get_node(node_before);
        if (!the_node_after) {
          logger.error('the node_after[id=' + node_after + '] can not be found.');
          return null;
        } else {
          return this.insert_node_after(the_node_after, nodeid, topic, data);
        }
      }
      var node_index = node_after.index + 0.5;
      return this.add_node(node_after.parent, nodeid, topic, data, node_index);
    },

    get_node_after: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return null;
        } else {
          return this.get_node_after(the_node);
        }
      }
      if (node.isroot) { return null; }
      var idx = node.index;
      var brothers = node.parent.children;
      if (brothers.length >= idx) {
        return node.parent.children[idx];
      } else {
        return null;
      }
    },

    move_node: function(node, beforeid, parentid, direction) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return null;
        } else {
          return this.move_node(the_node, beforeid, parentid, direction);
        }
      }
      if (!parentid) {
        parentid = node.parent.id;
      }
      return this._move_node(node, beforeid, parentid, direction);
    },

    _flow_node_direction: function(node, direction) {
      if (typeof direction === 'undefined') {
        direction = node.direction;
      } else {
        node.direction = direction;
      }
      var len = node.children.length;
      while (len--) {
        this._flow_node_direction(node.children[len], direction);
      }
    },

    _move_node_internal: function(node, beforeid) {
      if (!!node && !!beforeid) {
        if (beforeid == '_last_') {
          node.index = -1;
          this._reindex(node.parent);
        } else if (beforeid == '_first_') {
          node.index = 0;
          this._reindex(node.parent);
        } else {
          var node_before = (!!beforeid) ? this.get_node(beforeid) : null;
          if (node_before != null && node_before.parent != null && node_before.parent.id == node.parent.id) {
            node.index = node_before.index - 0.5;
            this._reindex(node.parent);
          }
        }
      }
      return node;
    },

    _move_node: function(node, beforeid, parentid, direction) {
      if (!!node && !!parentid) {
        if (node.parent.id != parentid) {
          // remove from parent's children
          var sibling = node.parent.children;
          var si = sibling.length;
          while (si--) {
            if (sibling[si].id == node.id) {
              sibling.splice(si, 1);
              break;
            }
          }
          node.parent = this.get_node(parentid);
          node.parent.children.push(node);
        }

        if (node.parent.isroot) {
          if (direction == jsMind.direction.left) {
            node.direction = direction;
          } else {
            node.direction = jm.direction.right;
          }
        } else {
          node.direction = node.parent.direction;
        }
        this._move_node_internal(node, beforeid);
        this._flow_node_direction(node);
      }
      return node;
    },

    remove_node: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return false;
        } else {
          return this.remove_node(the_node);
        }
      }
      if (!node) {
        logger.error('fail, the node can not be found');
        return false;
      }
      if (node.isroot) {
        logger.error('fail, can not remove root node');
        return false;
      }

      // 清除右上角badge
      $('div.leo-badge[nodeid$="' + node.id + '"]').remove();

      if (this.selected != null && this.selected.id == node.id) {
        this.selected = null;
      }
      // clean all subordinate nodes
      var children = node.children;
      var ci = children.length;
      while (ci--) {
        this.remove_node(children[ci]);
      }
      // clean all children
      children.length = 0;
      // remove from parent's children
      var sibling = node.parent.children;
      var si = sibling.length;
      while (si--) {
        if (sibling[si].id == node.id) {
          sibling.splice(si, 1);
          break;
        }
      }
      // remove from global nodes
      delete this.nodes[node.id];
      // clean all properties
      for (var k in node) {
        delete node[k];
      }
      // remove it's self
      node = null;
      //delete node;
      return true;
    },

    _put_node: function(node) {
      if (node.id in this.nodes) {
        logger.warn('the nodeid \'' + node.id + '\' has been already exist.');
        return false;
      } else {
        this.nodes[node.id] = node;
        return true;
      }
    },

    _reindex: function(node) {
      if (node instanceof jm.node) {
        node.children.sort(jm.node.compare);
        for (var i = 0; i < node.children.length; i++) {
          node.children[i].index = i + 1;
        }
      }
    },
  };

  jm.format = {
    node_tree: {
      example: {
        "meta": {
          "name": __name__,
          "author": __author__,
          "version": __version__
        },
        "format": "node_tree",
        "data": { "id": "root", "topic": "jsMind Example" }
      },
      get_mind: function(source) {
        var df = jm.format.node_tree;
        var mind = new jm.mind();
        mind.name = source.meta.name;
        mind.author = source.meta.author;
        mind.version = source.meta.version;
        df._parse(mind, source.data);
        return mind;
      },
      get_data: function(mind) {
        var df = jm.format.node_tree;
        var json = {};
        json.meta = {
          name: mind.name,
          author: mind.author,
          version: mind.version
        };
        json.format = 'node_tree';
        json.data = df._buildnode(mind.root);
        return json;
      },

      _parse: function(mind, node_root) {
        var df = jm.format.node_tree;
        var data = df._extract_data(node_root);
        mind.set_root(node_root.id, node_root.topic, data);
        if ('children' in node_root) {
          var children = node_root.children;
          for (var i = 0; i < children.length; i++) {
            df._extract_subnode(mind, mind.root, children[i]);
          }
        }
      },

      _extract_data: function(node_json) {
        var data = {};
        for (var k in node_json) {
          if (k == 'id' || k == 'topic' || k == 'children' || k == 'direction' || k == 'expanded') {
            continue;
          }
          data[k] = node_json[k];
        }
        return data;
      },

      _extract_subnode: function(mind, node_parent, node_json) {
        var df = jm.format.node_tree;
        var data = df._extract_data(node_json);
        var d = null;
        if (node_parent.isroot) {
          d = node_json.direction == 'left' ? jm.direction.left : jm.direction.right;
        }
        var node = mind.add_node(node_parent, node_json.id, node_json.topic, data, null, d, node_json.expanded);
        if ('children' in node_json) {
          var children = node_json.children;
          for (var i = 0; i < children.length; i++) {
            df._extract_subnode(mind, node, children[i]);
          }
        }
      },

      _buildnode: function(node) {
        var df = jm.format.node_tree;
        if (!(node instanceof jm.node)) { return; }
        var o = {
          id: node.id,
          topic: node.topic,
          expanded: node.expanded
        };
        if (!!node.parent && node.parent.isroot) {
          o.direction = node.direction == jm.direction.left ? 'left' : 'right';
        }
        if (node.data != null) {
          var node_data = node.data;
          for (var k in node_data) {
            o[k] = node_data[k];
          }
        }
        var children = node.children;
        if (children.length > 0) {
          o.children = [];
          for (var i = 0; i < children.length; i++) {
            o.children.push(df._buildnode(children[i]));
          }
        }
        return o;
      }
    },

    node_array: {
      example: {
        "meta": {
          "name": __name__,
          "author": __author__,
          "version": __version__
        },
        "format": "node_array",
        "data": [
          { "id": "root", "topic": "jsMind Example", "isroot": true }
        ]
      },

      get_mind: function(source) {
        var df = jm.format.node_array;
        var mind = new jm.mind();
        mind.name = source.meta.name;
        mind.author = source.meta.author;
        mind.version = source.meta.version;
        df._parse(mind, source.data);
        return mind;
      },

      get_data: function(mind) {
        var df = jm.format.node_array;
        var json = {};
        json.meta = {
          name: mind.name,
          author: mind.author,
          version: mind.version
        };
        json.format = 'node_array';
        json.data = [];
        df._array(mind, json.data);
        return json;
      },

      _parse: function(mind, node_array) {
        var df = jm.format.node_array;
        var narray = node_array.slice(0);
        // reverse array for improving looping performance
        narray.reverse();
        var root_id = df._extract_root(mind, narray);
        if (!!root_id) {
          df._extract_subnode(mind, root_id, narray);
        } else {
          logger.error('root node can not be found');
        }
      },

      _extract_root: function(mind, node_array) {
        var df = jm.format.node_array;
        var i = node_array.length;
        while (i--) {
          if ('isroot' in node_array[i] && node_array[i].isroot) {
            var root_json = node_array[i];
            var data = df._extract_data(root_json);
            mind.set_root(root_json.id, root_json.topic, data);
            node_array.splice(i, 1);
            return root_json.id;
          }
        }
        return null;
      },

      _extract_subnode: function(mind, parentid, node_array) {
        var df = jm.format.node_array;
        var i = node_array.length;
        var node_json = null;
        var data = null;
        var extract_count = 0;
        while (i--) {
          node_json = node_array[i];
          if (node_json.parentid == parentid) {
            data = df._extract_data(node_json);
            var d = null;
            var node_direction = node_json.direction;
            if (!!node_direction) {
              d = node_direction == 'left' ? jm.direction.left : jm.direction.right;
            }
            mind.add_node(parentid, node_json.id, node_json.topic, data, null, d, node_json.expanded);
            node_array.splice(i, 1);
            extract_count++;
            var sub_extract_count = df._extract_subnode(mind, node_json.id, node_array);
            if (sub_extract_count > 0) {
              // reset loop index after extract subordinate node
              i = node_array.length;
              extract_count += sub_extract_count;
            }
          }
        }
        return extract_count;
      },

      _extract_data: function(node_json) {
        var data = {};
        for (var k in node_json) {
          if (k == 'id' || k == 'topic' || k == 'parentid' || k == 'isroot' || k == 'direction' || k == 'expanded') {
            continue;
          }
          data[k] = node_json[k];
        }
        return data;
      },

      _array: function(mind, node_array) {
        var df = jm.format.node_array;
        df._array_node(mind.root, node_array);
      },

      _array_node: function(node, node_array) {
        var df = jm.format.node_array;
        if (!(node instanceof jm.node)) { return; }
        var o = {
          id: node.id,
          topic: node.topic,
          expanded: node.expanded
        };
        if (!!node.parent) {
          o.parentid = node.parent.id;
        }
        if (node.isroot) {
          o.isroot = true;
        }
        if (!!node.parent && node.parent.isroot) {
          o.direction = node.direction == jm.direction.left ? 'left' : 'right';
        }
        if (node.data != null) {
          var node_data = node.data;
          for (var k in node_data) {
            o[k] = node_data[k];
          }
        }
        node_array.push(o);
        var ci = node.children.length;
        for (var i = 0; i < ci; i++) {
          df._array_node(node.children[i], node_array);
        }
      },
    },

    freemind: {
      example: {
        "meta": {
          "name": __name__,
          "author": __author__,
          "version": __version__
        },
        "format": "freemind",
        "data": "<map version=\"1.0.1\"><node ID=\"root\" TEXT=\"freemind Example\"/></map>"
      },
      get_mind: function(source) {
        var df = jm.format.freemind;
        var mind = new jm.mind();
        mind.name = source.meta.name;
        mind.author = source.meta.author;
        mind.version = source.meta.version;
        var xml = source.data;
        var xml_doc = df._parse_xml(xml);
        var xml_root = df._find_root(xml_doc);
        df._load_node(mind, null, xml_root);
        return mind;
      },

      get_data: function(mind) {
        var df = jm.format.freemind;
        var json = {};
        json.meta = {
          name: mind.name,
          author: mind.author,
          version: mind.version
        };
        json.format = 'freemind';
        var xmllines = [];
        xmllines.push('<map version=\"1.0.1\">');
        df._buildmap(mind.root, xmllines);
        xmllines.push('</map>');
        json.data = xmllines.join(' ');
        return json;
      },

      _parse_xml: function(xml) {
        var xml_doc = null;
        if (window.DOMParser) {
          var parser = new DOMParser();
          xml_doc = parser.parseFromString(xml, 'text/xml');
        } else { // Internet Explorer
          xml_doc = new ActiveXObject('Microsoft.XMLDOM');
          xml_doc.async = false;
          xml_doc.loadXML(xml);
        }
        return xml_doc;
      },

      _find_root: function(xml_doc) {
        var nodes = xml_doc.childNodes;
        var node = null;
        var root = null;
        var n = null;
        for (var i = 0; i < nodes.length; i++) {
          n = nodes[i];
          if (n.nodeType == 1 && n.tagName == 'map') {
            node = n;
            break;
          }
        }
        if (!!node) {
          var ns = node.childNodes;
          node = null;
          for (var i = 0; i < ns.length; i++) {
            n = ns[i];
            if (n.nodeType == 1 && n.tagName == 'node') {
              node = n;
              break;
            }
          }
        }
        return node;
      },

      _load_node: function(mind, parent_id, xml_node) {
        var df = jm.format.freemind;
        var node_id = xml_node.getAttribute('ID');
        var node_topic = xml_node.getAttribute('TEXT');
        // look for richcontent
        if (node_topic == null) {
          var topic_children = xml_node.childNodes;
          var topic_child = null;
          for (var i = 0; i < topic_children.length; i++) {
            topic_child = topic_children[i];
            //logger.debug(topic_child.tagName);
            if (topic_child.nodeType == 1 && topic_child.tagName === 'richcontent') {
              node_topic = topic_child.textContent;
              break;
            }
          }
        }
        var node_data = df._load_attributes(xml_node);
        var node_expanded = ('expanded' in node_data) ? (node_data.expanded == 'true') : true;
        delete node_data.expanded;

        var node_position = xml_node.getAttribute('POSITION');
        var node_direction = null;
        if (!!node_position) {
          node_direction = node_position == 'left' ? jm.direction.left : jm.direction.right;
        }
        //logger.debug(node_position +':'+ node_direction);
        if (!!parent_id) {
          mind.add_node(parent_id, node_id, node_topic, node_data, null, node_direction, node_expanded);
        } else {
          mind.set_root(node_id, node_topic, node_data);
        }
        var children = xml_node.childNodes;
        var child = null;
        for (var i = 0; i < children.length; i++) {
          child = children[i];
          if (child.nodeType == 1 && child.tagName == 'node') {
            df._load_node(mind, node_id, child);
          }
        }
      },

      _load_attributes: function(xml_node) {
        var children = xml_node.childNodes;
        var attr = null;
        var attr_data = {};
        for (var i = 0; i < children.length; i++) {
          attr = children[i];
          if (attr.nodeType == 1 && attr.tagName === 'attribute') {
            attr_data[attr.getAttribute('NAME')] = attr.getAttribute('VALUE');
          }
        }
        return attr_data;
      },

      _buildmap: function(node, xmllines) {
        var df = jm.format.freemind;
        var pos = null;
        if (!!node.parent && node.parent.isroot) {
          pos = node.direction === jm.direction.left ? 'left' : 'right';
        }
        xmllines.push('<node');
        xmllines.push('ID=\"' + node.id + '\"');
        if (!!pos) {
          xmllines.push('POSITION=\"' + pos + '\"');
        }
        xmllines.push('TEXT=\"' + node.topic + '\">');

        // store expanded status as an attribute
        xmllines.push('<attribute NAME=\"expanded\" VALUE=\"' + node.expanded + '\"/>');

        // for attributes
        var node_data = node.data;
        if (node_data != null) {
          for (var k in node_data) {
            xmllines.push('<attribute NAME=\"' + k + '\" VALUE=\"' + node_data[k] + '\"/>');
          }
        }

        // for children
        var children = node.children;
        for (var i = 0; i < children.length; i++) {
          df._buildmap(children[i], xmllines);
        }

        xmllines.push('</node>');
      },
    },
  };

  // ============= utility object =============================================

  jm.util = {
    is_node: function(node) {
      return !!node && node instanceof jm.node;
    },
    ajax: {
      _xhr: function() {
        var xhr = null;
        if (window.XMLHttpRequest) {
          xhr = new XMLHttpRequest();
        } else {
          try {
            xhr = new ActiveXObject('Microsoft.XMLHTTP');
          } catch (e) {}
        }
        return xhr;
      },
      _eurl: function(url) {
        return encodeURIComponent(url);
      },
      request: function(url, param, method, callback, fail_callback) {
        var a = jm.util.ajax;
        var p = null;
        var tmp_param = [];
        for (var k in param) {
          tmp_param.push(a._eurl(k) + '=' + a._eurl(param[k]));
        }
        if (tmp_param.length > 0) {
          p = tmp_param.join('&');
        }
        var xhr = a._xhr();
        if (!xhr) { return; }
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            if (xhr.status == 200 || xhr.status == 0) {
              if (typeof callback === 'function') {
                var data = jm.util.json.string2json(xhr.responseText);
                if (data != null) {
                  callback(data);
                } else {
                  callback(xhr.responseText);
                }
              }
            } else {
              if (typeof fail_callback === 'function') {
                fail_callback(xhr);
              } else {
                logger.error('xhr request failed.', xhr);
              }
            }
          }
        }
        method = method || 'GET';
        xhr.open(method, url, true);
        xhr.setRequestHeader('If-Modified-Since', '0');
        if (method == 'POST') {
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');
          xhr.send(p);
        } else {
          xhr.send();
        }
      },
      get: function(url, callback) {
        return jm.util.ajax.request(url, {}, 'GET', callback);
      },
      post: function(url, param, callback) {
        return jm.util.ajax.request(url, param, 'POST', callback);
      }
    },

    dom: {
      //target,eventType,handler
      add_event: function(t, e, h) {
        if (!!t.addEventListener) {
          t.addEventListener(e, h, false);
        } else {
          t.attachEvent('on' + e, h);
        }
      }
    },

    canvas: {
      bezierto: function(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1 + (x2 - x1) * 2 / 3, y1, x1, y2, x2, y2);
        ctx.stroke();
      },
      lineto: function(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      },
      clear: function(ctx, x, y, w, h) {
        ctx.clearRect(x, y, w, h);
      }
    },

    file: {
      read: function(file_data, fn_callback) {
        var reader = new FileReader();
        reader.onload = function() {
          if (typeof fn_callback === 'function') {
            fn_callback(this.result, file_data.name);
          }
        };
        reader.readAsText(file_data);
      },

      save: function(file_data, type, name) {
        var blob;
        if (typeof $w.Blob === 'function') {
          blob = new Blob([file_data], { type: type });
        } else {
          var BlobBuilder = $w.BlobBuilder || $w.MozBlobBuilder || $w.WebKitBlobBuilder || $w.MSBlobBuilder;
          var bb = new BlobBuilder();
          bb.append(file_data);
          blob = bb.getBlob(type);
        }
        if (navigator.msSaveBlob) {
          navigator.msSaveBlob(blob, name);
        } else {
          var URL = $w.URL || $w.webkitURL;
          var bloburl = URL.createObjectURL(blob);
          var anchor = $c('a');
          if ('download' in anchor) {
            anchor.style.visibility = 'hidden';
            anchor.href = bloburl;
            anchor.download = name;
            $d.body.appendChild(anchor);
            var evt = $d.createEvent('MouseEvents');
            evt.initEvent('click', true, true);
            anchor.dispatchEvent(evt);
            $d.body.removeChild(anchor);
          } else {
            location.href = bloburl;
          }
        }
      }
    },

    json: {
      json2string: function(json) {
        if (!!JSON) {
          try {
            var json_str = JSON.stringify(json);
            return json_str;
          } catch (e) {
            logger.warn(e);
            logger.warn('can not convert to string');
            return null;
          }
        }
      },
      string2json: function(json_str) {
        if (!!JSON) {
          try {
            var json = JSON.parse(json_str);
            return json;
          } catch (e) {
            logger.warn(e);
            logger.warn('can not parse to json');
            return null;
          }
        }
      },
      merge: function(b, a) {
        for (var o in a) {
          if (o in b) {
            if (typeof b[o] === 'object' &&
              Object.prototype.toString.call(b[o]).toLowerCase() == '[object object]' &&
              !b[o].length) {
              jm.util.json.merge(b[o], a[o]);
            } else {
              b[o] = a[o];
            }
          } else {
            b[o] = a[o];
          }
        }
        return b;
      }
    },

    uuid: {
      newid: function() {
        return (new Date().getTime().toString(16) + Math.random().toString(16).substr(2)).substr(2, 16);
      }
    },

    text: {
      is_empty: function(s) {
        if (!s) { return true; }
        return s.replace(/\s*/, '').length == 0;
      }
    }
  };

  jm.prototype = {
    init: function() {
      if (this.inited) { return; }
      this.inited = true;

      var opts = this.options;

      var opts_layout = {
        mode: opts.mode,
        hspace: opts.layout.hspace,
        vspace: opts.layout.vspace,
        pspace: opts.layout.pspace
      }
      var opts_view = {
        container: opts.container,
        support_html: opts.support_html,
        hmargin: opts.view.hmargin,
        vmargin: opts.view.vmargin,
        line_width: opts.view.line_width,
        line_color: opts.view.line_color
      };
      // create instance of function provider
      this.data = new jm.data_provider(this);
      this.layout = new jm.layout_provider(this, opts_layout);
      this.view = new jm.view_provider(this, opts_view);
      this.shortcut = new jm.shortcut_provider(this, opts.shortcut);

      this.data.init();
      this.layout.init();
      this.view.init();
      this.shortcut.init();

      this._event_bind();

      jm.init_plugins(this);
    },

    enable_edit: function() {
      this.options.editable = true;
    },

    disable_edit: function() {
      this.options.editable = false;
    },

    // call enable_event_handle('dblclick')
    // options are 'mousedown', 'click', 'dblclick'
    enable_event_handle: function(event_handle) {
      this.options.default_event_handle['enable_' + event_handle + '_handle'] = true;
    },

    // call disable_event_handle('dblclick')
    // options are 'mousedown', 'click', 'dblclick'
    disable_event_handle: function(event_handle) {
      this.options.default_event_handle['enable_' + event_handle + '_handle'] = false;
    },

    get_editable: function() {
      return this.options.editable;
    },

    set_theme: function(theme) {
      var theme_old = this.options.theme;
      this.options.theme = (!!theme) ? theme : null;
      if (theme_old != this.options.theme) {
        this.view.reset_theme();
        this.view.reset_custom_style();
      }
    },
    _event_bind: function() {
      this.view.add_event(this, 'mousedown', this.mousedown_handle);
      this.view.add_event(this, 'click', this.click_handle);
      this.view.add_event(this, 'dblclick', this.dblclick_handle);
    },

    mousedown_handle: function(e) {
      if (!this.options.default_event_handle['enable_mousedown_handle']) {
        return;
      }
      var element = e.target || event.srcElement;
      var nodeid = this.view.get_binded_nodeid(element);
      if (!!nodeid) {
        this.select_node(nodeid);
      } else {
        this.select_clear();
      }
    },

    click_handle: function(e) {
      if (!this.options.default_event_handle['enable_click_handle']) {
        return;
      }

      var element = e.target || event.srcElement;
      var isexpander = this.view.is_expander(element);
      if (isexpander) {
        var nodeid = this.view.get_binded_nodeid(element);
        if (!!nodeid) {
          this.toggle_node(nodeid);
          return;
        }
      }
      // 不可编辑下单机触发关联事件
      if(!this.get_editable()){
          var onRelation = this.options.onRelation;
          if(!onRelation)
            return;
          var nodeid = this.view.get_binded_nodeid(element);
          if (!!nodeid) {
              onRelation(this.mind.selected);
          }
      }

    },

    dblclick_handle: function(e) {
      if (!this.options.default_event_handle['enable_dblclick_handle']) {
        return;
      }
      if (this.get_editable()) {
        var element = e.target || event.srcElement;
        var nodeid = this.view.get_binded_nodeid(element);
        if (!!nodeid) {
          this.begin_edit(nodeid);
        }
      }
    },

    begin_edit: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return false;
        } else {
          return this.begin_edit(the_node);
        }
      }
      if (this.get_editable()) {
        this.view.edit_node_begin(node);
      } else {
        logger.error('fail, this mind map is not editable.');
        return;
      }
    },

    end_edit: function() {
      this.view.edit_node_end();
    },

    toggle_node: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return;
        } else {
          return this.toggle_node(the_node);
        }
      }
      if (node.isroot) { return; }
      this.view.save_location(node);
      this.layout.toggle_node(node);
      this.view.relayout();
      this.view.restore_location(node);
    },

    expand_node: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return;
        } else {
          return this.expand_node(the_node);
        }
      }
      if (node.isroot) { return; }
      this.view.save_location(node);
      this.layout.expand_node(node);
      this.view.relayout();
      this.view.restore_location(node);
    },

    collapse_node: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return;
        } else {
          return this.collapse_node(the_node);
        }
      }
      if (node.isroot) { return; }
      this.view.save_location(node);
      this.layout.collapse_node(node);
      this.view.relayout();
      this.view.restore_location(node);
    },

    expand_all: function() {
      this.layout.expand_all();
      this.view.relayout();
    },

    collapse_all: function() {
      this.layout.collapse_all();
      this.view.relayout();
    },

    expand_to_depth: function(depth) {
      this.layout.expand_to_depth(depth);
      this.view.relayout();
    },

    _reset: function() {
      this.view.reset();
      this.layout.reset();
      this.data.reset();
    },

    _show: function(mind) {
      var m = mind || jm.format.node_array.example;

      this.mind = this.data.load(m);
      if (!this.mind) {
        logger.error('data.load error');
        return;
      } else {
        logger.debug('data.load ok');
      }

      this.view.load();
      logger.debug('view.load ok');

      this.layout.layout();
      logger.debug('layout.layout ok');

      this.view.show(true);
      logger.debug('view.show ok');

      this.invoke_event_handle(jm.event_type.show, { data: [mind] });
    },

    show: function(mind) {
      this._reset();
      this._show(mind);
    },

    get_meta: function() {
      return {
        name: this.mind.name,
        author: this.mind.author,
        version: this.mind.version
      };
    },

    get_data: function(data_format) {
      var df = data_format || 'node_tree';
      return this.data.get_data(df);
    },

    get_root: function() {
      return this.mind.root;
    },

    get_node: function(nodeid) {
      return this.mind.get_node(nodeid);
    },

    add_node: function(parent_node, nodeid, topic, data) {
      if (this.get_editable()) {
        var node = this.mind.add_node(parent_node, nodeid, topic, data);
        if (!!node) {
          this.view.add_node(node);
          this.layout.layout();
          this.view.show(false);
          this.view.reset_node_custom_style(node);
          this.expand_node(parent_node);
          this.invoke_event_handle(jm.event_type.edit, { evt: 'add_node', data: [parent_node.id, nodeid, topic, data], node: nodeid });
        }
        return node;
      } else {
        logger.error('fail, this mind map is not editable');
        return null;
      }
    },

    insert_node_before: function(node_before, nodeid, topic, data) {
      if (this.get_editable()) {
        var beforeid = jm.util.is_node(node_before) ? node_before.id : node_before;
        var node = this.mind.insert_node_before(node_before, nodeid, topic, data);
        if (!!node) {
          this.view.add_node(node);
          this.layout.layout();
          this.view.show(false);
          this.invoke_event_handle(jm.event_type.edit, { evt: 'insert_node_before', data: [beforeid, nodeid, topic, data], node: nodeid });
        }
        return node;
      } else {
        logger.error('fail, this mind map is not editable');
        return null;
      }
    },

    insert_node_after: function(node_after, nodeid, topic, data) {
      if (this.get_editable()) {
        var afterid = jm.util.is_node(node_after) ? node_after.id : node_after;
        var node = this.mind.insert_node_after(node_after, nodeid, topic, data);
        if (!!node) {
          this.view.add_node(node);
          this.layout.layout();
          this.view.show(false);
          this.invoke_event_handle(jm.event_type.edit, { evt: 'insert_node_after', data: [afterid, nodeid, topic, data], node: nodeid });
        }
        return node;
      } else {
        logger.error('fail, this mind map is not editable');
        return null;
      }
    },

    remove_node: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return false;
        } else {
          return this.remove_node(the_node);
        }
      }
      if (this.get_editable()) {
        if (node.isroot) {
          logger.error('fail, can not remove root node');
          return false;
        }
        var nodeid = node.id;
        var parentid = node.parent.id;
        var parent_node = this.get_node(parentid);
        this.view.save_location(parent_node);
        this.view.remove_node(node);
        this.mind.remove_node(node);
        this.layout.layout();
        this.view.show(false);
        this.view.restore_location(parent_node);
        this.invoke_event_handle(jm.event_type.edit, { evt: 'remove_node', data: [nodeid], node: parentid });
        return true;
      } else {
        logger.error('fail, this mind map is not editable');
        return false;
      }
    },

    update_node: function(nodeid, topic) {
      if (this.get_editable()) {
        if (jm.util.text.is_empty(topic)) {
          logger.warn('fail, topic can not be empty');
          return;
        }
        var node = this.get_node(nodeid);
        if (!!node) {
          if (node.topic === topic) {
            logger.info('nothing changed');
            this.view.update_node(node);
            return;
          }
          node.topic = topic;
          this.view.update_node(node);
          this.layout.layout();
          this.view.show(false);
          this.invoke_event_handle(jm.event_type.edit, { evt: 'update_node', data: [nodeid, topic], node: nodeid });
        }
      } else {
        logger.error('fail, this mind map is not editable');
        return;
      }
    },

    move_node: function(nodeid, beforeid, parentid, direction) {
      if (this.get_editable()) {
        var node = this.mind.move_node(nodeid, beforeid, parentid, direction);
        if (!!node) {
          this.view.update_node(node);
          this.layout.layout();
          this.view.show(false);
          this.invoke_event_handle(jm.event_type.edit, { evt: 'move_node', data: [nodeid, beforeid, parentid, direction], node: nodeid });
        }
      } else {
        logger.error('fail, this mind map is not editable');
        return;
      }
    },

    select_node: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return;
        } else {
          return this.select_node(the_node);
        }
      }
      if (!this.layout.is_visible(node)) {
        return;
      }
      this.mind.selected = node;
      this.view.select_node(node);
    },

    get_selected_node: function() {
      if (!!this.mind) {
        return this.mind.selected;
      } else {
        return null;
      }
    },

    select_clear: function() {
      if (!!this.mind) {
        this.mind.selected = null;
        this.view.select_clear();
      }
    },

    is_node_visible: function(node) {
      return this.layout.is_visible(node);
    },

    find_node_before: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return;
        } else {
          return this.find_node_before(the_node);
        }
      }
      if (node.isroot) { return null; }
      var n = null;
      if (node.parent.isroot) {
        var c = node.parent.children;
        var prev = null;
        var ni = null;
        for (var i = 0; i < c.length; i++) {
          ni = c[i];
          if (node.direction === ni.direction) {
            if (node.id === ni.id) {
              n = prev;
            }
            prev = ni;
          }
        }
      } else {
        n = this.mind.get_node_before(node);
      }
      return n;
    },

    find_node_after: function(node) {
      if (!jm.util.is_node(node)) {
        var the_node = this.get_node(node);
        if (!the_node) {
          logger.error('the node[id=' + node + '] can not be found.');
          return;
        } else {
          return this.find_node_after(the_node);
        }
      }
      if (node.isroot) { return null; }
      var n = null;
      if (node.parent.isroot) {
        var c = node.parent.children;
        var getthis = false;
        var ni = null;
        for (var i = 0; i < c.length; i++) {
          ni = c[i];
          if (node.direction === ni.direction) {
            if (getthis) {
              n = ni;
              break;
            }
            if (node.id === ni.id) {
              getthis = true;
            }
          }
        }
      } else {
        n = this.mind.get_node_after(node);
      }
      return n;
    },

    set_node_color: function(nodeid, bgcolor, fgcolor) {
      if (this.get_editable()) {
        var node = this.mind.get_node(nodeid);
        if (!!node) {
          if (!!bgcolor) {
            node.data['background-color'] = bgcolor;
          }
          if (!!fgcolor) {
            node.data['foreground-color'] = fgcolor;
          }
          this.view.reset_node_custom_style(node);
        }
      } else {
        logger.error('fail, this mind map is not editable');
        return null;
      }
    },

    set_node_font_style: function(nodeid, size, weight, style) {
      if (this.get_editable()) {
        var node = this.mind.get_node(nodeid);
        if (!!node) {
          if (!!size) {
            node.data['font-size'] = size;
          }
          if (!!weight) {
            node.data['font-weight'] = weight;
          }
          if (!!style) {
            node.data['font-style'] = style;
          }
          this.view.reset_node_custom_style(node);
          this.view.update_node(node);
          this.layout.layout();
          this.view.show(false);
        }
      } else {
        logger.error('fail, this mind map is not editable');
        return null;
      }
    },

    set_node_background_image: function(nodeid, image, width, height, rotation) {
      if (this.get_editable()) {
        var node = this.mind.get_node(nodeid);
        if (!!node) {
          if (!!image) {
            node.data['background-image'] = image;
          }
          if (!!width) {
            node.data['width'] = width;
          }
          if (!!height) {
            node.data['height'] = height;
          }
          if (!!rotation) {
            node.data['background-rotation'] = rotation;
          }
          this.view.reset_node_custom_style(node);
          this.view.update_node(node);
          this.layout.layout();
          this.view.show(false);
        }
      } else {
        logger.error('fail, this mind map is not editable');
        return null;
      }
    },

    set_node_background_rotation: function(nodeid, rotation) {
      if (this.get_editable()) {
        var node = this.mind.get_node(nodeid);
        if (!!node) {
          if (!node.data['background-image']) {
            logger.error('fail, only can change rotation angle of node with background image');
            return null;
          }
          node.data['background-rotation'] = rotation;
          this.view.reset_node_custom_style(node);
          this.view.update_node(node);
          this.layout.layout();
          this.view.show(false);
        }
      } else {
        logger.error('fail, this mind map is not editable');
        return null;
      }
    },

    resize: function() {
      this.view.resize();
    },

    // callback(type ,data)
    add_event_listener: function(callback) {
      if (typeof callback === 'function') {
        this.event_handles.push(callback);
      }
    },

    invoke_event_handle: function(type, data) {
      var j = this;
      $w.setTimeout(function() {
        j._invoke_event_handle(type, data);
      }, 0);
    },

    _invoke_event_handle: function(type, data) {
      var l = this.event_handles.length;
      for (var i = 0; i < l; i++) {
        this.event_handles[i](type, data);
      }
    }

  };

  // ============= data provider =============================================

  jm.data_provider = function(jm) {
    this.jm = jm;
  };

  jm.data_provider.prototype = {
    init: function() {
      logger.debug('data.init');
    },

    reset: function() {
      logger.debug('data.reset');
    },

    load: function(mind_data) {
      var df = null;
      var mind = null;
      if (typeof mind_data === 'object') {
        if (!!mind_data.format) {
          df = mind_data.format;
        } else {
          df = 'node_tree';
        }
      } else {
        df = 'freemind';
      }

      if (df == 'node_array') {
        mind = jm.format.node_array.get_mind(mind_data);
      } else if (df == 'node_tree') {
        mind = jm.format.node_tree.get_mind(mind_data);
      } else if (df == 'freemind') {
        mind = jm.format.freemind.get_mind(mind_data);
      } else {
        logger.warn('unsupported format');
      }
      return mind;
    },

    get_data: function(data_format) {
      var data = null;
      if (data_format == 'node_array') {
        data = jm.format.node_array.get_data(this.jm.mind);
      } else if (data_format == 'node_tree') {
        data = jm.format.node_tree.get_data(this.jm.mind);
      } else if (data_format == 'freemind') {
        data = jm.format.freemind.get_data(this.jm.mind);
      } else {
        logger.error('unsupported ' + data_format + ' format');
      }
      return data;
    },
  };

  // ============= layout provider ===========================================

  jm.layout_provider = function(jm, options) {
    this.opts = options;
    this.jm = jm;
    this.isside = (this.opts.mode == 'side');
    this.bounds = null;

    this.cache_valid = false;
  };

  jm.layout_provider.prototype = {
    init: function() {
      logger.debug('layout.init');
    },
    reset: function() {
      logger.debug('layout.reset');
      this.bounds = { n: 0, s: 0, w: 0, e: 0 };
    },
    layout: function() {
      logger.debug('layout.layout');
      this.layout_direction();
      this.layout_offset();
    },

    layout_direction: function() {
      this._layout_direction_root();
    },

    _layout_direction_root: function() {
      var node = this.jm.mind.root;
      // logger.debug(node);
      var layout_data = null;
      if ('layout' in node._data) {
        layout_data = node._data.layout;
      } else {
        layout_data = {};
        node._data.layout = layout_data;
      }
      var children = node.children;
      var children_count = children.length;
      layout_data.direction = jm.direction.center;
      layout_data.side_index = 0;
      if (this.isside) {
        var i = children_count;
        while (i--) {
          this._layout_direction_side(children[i], jm.direction.right, i);
        }
      } else {
        var i = children_count;
        var subnode = null;
        while (i--) {
          subnode = children[i];
          if (subnode.direction == jm.direction.left) {
            this._layout_direction_side(subnode, jm.direction.left, i);
          } else {
            this._layout_direction_side(subnode, jm.direction.right, i);
          }
        }
        /*
        var boundary = Math.ceil(children_count/2);
        var i = children_count;
        while(i--){
            if(i>=boundary){
                this._layout_direction_side(children[i],jm.direction.left, children_count-i-1);
            }else{
                this._layout_direction_side(children[i],jm.direction.right, i);
            }
        }*/

      }
    },

    _layout_direction_side: function(node, direction, side_index) {
      var layout_data = null;
      if ('layout' in node._data) {
        layout_data = node._data.layout;
      } else {
        layout_data = {};
        node._data.layout = layout_data;
      }
      var children = node.children;
      var children_count = children.length;

      layout_data.direction = direction;
      layout_data.side_index = side_index;
      var i = children_count;
      while (i--) {
        this._layout_direction_side(children[i], direction, i);
      }
    },

    layout_offset: function() {
      var node = this.jm.mind.root;
      var layout_data = node._data.layout;
      layout_data.offset_x = 0;
      layout_data.offset_y = 0;
      layout_data.outer_height = 0;
      var children = node.children;
      var i = children.length;
      var left_nodes = [];
      var right_nodes = [];
      var subnode = null;
      while (i--) {
        subnode = children[i];
        if (subnode._data.layout.direction == jm.direction.right) {
          right_nodes.unshift(subnode);
        } else {
          left_nodes.unshift(subnode);
        }
      }
      layout_data.left_nodes = left_nodes;
      layout_data.right_nodes = right_nodes;
      layout_data.outer_height_left = this._layout_offset_subnodes(left_nodes);
      layout_data.outer_height_right = this._layout_offset_subnodes(right_nodes);
      this.bounds.e = node._data.view.width / 2;
      this.bounds.w = 0 - this.bounds.e;
      //logger.debug(this.bounds.w);
      this.bounds.n = 0;
      this.bounds.s = Math.max(layout_data.outer_height_left, layout_data.outer_height_right);
    },

    // layout both the x and y axis
    _layout_offset_subnodes: function(nodes) {
      var total_height = 0;
      var nodes_count = nodes.length;
      var i = nodes_count;
      var node = null;
      var node_outer_height = 0;
      var layout_data = null;
      var base_y = 0;
      var pd = null; // parent._data
      while (i--) {
        node = nodes[i];
        layout_data = node._data.layout;
        if (pd == null) {
          pd = node.parent._data;
        }

        node_outer_height = this._layout_offset_subnodes(node.children);
        if (!node.expanded) {
          node_outer_height = 0;
          this.set_visible(node.children, false);
        }
        node_outer_height = Math.max(node._data.view.height, node_outer_height);

        layout_data.outer_height = node_outer_height;
        layout_data.offset_y = base_y - node_outer_height / 2;
        layout_data.offset_x = this.opts.hspace * layout_data.direction + pd.view.width * (pd.layout.direction + layout_data.direction) / 2;
        if (!node.parent.isroot) {
          layout_data.offset_x += this.opts.pspace * layout_data.direction;
        }

        base_y = base_y - node_outer_height - this.opts.vspace;
        total_height += node_outer_height;
      }
      if (nodes_count > 1) {
        total_height += this.opts.vspace * (nodes_count - 1);
      }
      i = nodes_count;
      var middle_height = total_height / 2;
      while (i--) {
        node = nodes[i];
        node._data.layout.offset_y += middle_height;
      }
      return total_height;
    },

    // layout the y axis only, for collapse/expand a node
    _layout_offset_subnodes_height: function(nodes) {
      var total_height = 0;
      var nodes_count = nodes.length;
      var i = nodes_count;
      var node = null;
      var node_outer_height = 0;
      var layout_data = null;
      var base_y = 0;
      var pd = null; // parent._data
      while (i--) {
        node = nodes[i];
        layout_data = node._data.layout;
        if (pd == null) {
          pd = node.parent._data;
        }

        node_outer_height = this._layout_offset_subnodes_height(node.children);
        if (!node.expanded) {
          node_outer_height = 0;
        }
        node_outer_height = Math.max(node._data.view.height, node_outer_height);

        layout_data.outer_height = node_outer_height;
        layout_data.offset_y = base_y - node_outer_height / 2;
        base_y = base_y - node_outer_height - this.opts.vspace;
        total_height += node_outer_height;
      }
      if (nodes_count > 1) {
        total_height += this.opts.vspace * (nodes_count - 1);
      }
      i = nodes_count;
      var middle_height = total_height / 2;
      while (i--) {
        node = nodes[i];
        node._data.layout.offset_y += middle_height;
        //logger.debug(node.topic);
        //logger.debug(node._data.layout.offset_y);
      }
      return total_height;
    },

    get_node_offset: function(node) {
      var layout_data = node._data.layout;
      var offset_cache = null;
      if (('_offset_' in layout_data) && this.cache_valid) {
        offset_cache = layout_data._offset_;
      } else {
        offset_cache = { x: -1, y: -1 };
        layout_data._offset_ = offset_cache;
      }
      if (offset_cache.x == -1 || offset_cache.y == -1) {
        var x = layout_data.offset_x;
        var y = layout_data.offset_y;
        if (!node.isroot) {
          var offset_p = this.get_node_offset(node.parent);
          x += offset_p.x;
          y += offset_p.y;
        }
        offset_cache.x = x;
        offset_cache.y = y;
      }
      return offset_cache;
    },

    get_node_point: function(node) {
      var view_data = node._data.view;
      var offset_p = this.get_node_offset(node);
      //logger.debug(offset_p);
      var p = {};
      p.x = offset_p.x + view_data.width * (node._data.layout.direction - 1) / 2;
      p.y = offset_p.y - view_data.height / 2;
      //logger.debug(p);
      return p;
    },

    get_node_point_in: function(node) {
      var p = this.get_node_offset(node);
      return p;
    },

    get_node_point_out: function(node) {
      var layout_data = node._data.layout;
      var pout_cache = null;
      if (('_pout_' in layout_data) && this.cache_valid) {
        pout_cache = layout_data._pout_;
      } else {
        pout_cache = { x: -1, y: -1 };
        layout_data._pout_ = pout_cache;
      }
      if (pout_cache.x == -1 || pout_cache.y == -1) {
        if (node.isroot) {
          pout_cache.x = 0;
          pout_cache.y = 0;
        } else {
          var view_data = node._data.view;
          var offset_p = this.get_node_offset(node);
          pout_cache.x = offset_p.x + (view_data.width + this.opts.pspace) * node._data.layout.direction;
          pout_cache.y = offset_p.y;
          //logger.debug('pout');
          //logger.debug(pout_cache);
        }
      }
      return pout_cache;
    },

    get_expander_point: function(node) {
      var p = this.get_node_point_out(node);
      var ex_p = {};
      if (node._data.layout.direction == jm.direction.right) {
        ex_p.x = p.x - this.opts.pspace;
      } else {
        ex_p.x = p.x;
      }
      ex_p.y = p.y - Math.ceil(this.opts.pspace / 2);
      return ex_p;
    },

    get_min_size: function() {
      var nodes = this.jm.mind.nodes;
      var node = null;
      var pout = null;
      for (var nodeid in nodes) {
        node = nodes[nodeid];
        if(node.parent && !node.parent.expanded){
            continue;
        }
        pout = this.get_node_point_out(node);
        //logger.debug(pout.x);
        if (pout.x > this.bounds.e) { this.bounds.e = pout.x; }
        if (pout.x < this.bounds.w) { this.bounds.w = pout.x; }
      }
      return {
        w: this.bounds.e - this.bounds.w,
        h: this.bounds.s - this.bounds.n
      }
    },

    toggle_node: function(node) {
      if (node.isroot) {
        return;
      }
      if (node.expanded) {
        this.collapse_node(node);
      } else {
        this.expand_node(node);
      }
    },
    // 展开节点
    expand_node: function(node) {
      node.expanded = true;
      this.part_layout(node);
      this.set_visible(node.children, true);
      this.toggleBadge(node.children, true);
    },
    // 收叠节点
    collapse_node: function(node) {
      node.expanded = false;
      this.part_layout(node);
      this.set_visible(node.children, false);
      this.toggleBadge(node.children, false);
    },
    // 隐藏/显示 badger
    // true: 显示
    // false: 隐藏
    toggleBadge: function(nodes, isShow) {
      // console.log(isShow === true ? '显示' : '隐藏', nodes)
      var that = this;

      nodes.forEach(function(e) {
        // var visible = e._data.layout.visible
        var visible = that.jm.is_node_visible(e);
        // console.log('visible', visible)
        if (visible === true) return true;
        // 多层级显示隐藏
        that.toggleBadge(e.children,isShow);
        var $ele = $('div.leo-badge[nodeid$="' + e.id + '"]');
        if (isShow === true) {
          $ele.show();
        } else {
          $ele.hide();
        }
      });
    },

    expand_all: function() {
      var nodes = this.jm.mind.nodes;
      var c = 0;
      var node;
      for (var nodeid in nodes) {
        node = nodes[nodeid];
        if (!node.expanded) {
          node.expanded = true;
          c++;
        }
      }
      if (c > 0) {
        var root = this.jm.mind.root;
        this.part_layout(root);
        this.set_visible(root.children, true);
      }
    },

    collapse_all: function() {
      var nodes = this.jm.mind.nodes;
      var c = 0;
      var node;
      for (var nodeid in nodes) {
        node = nodes[nodeid];
        if (node.expanded && !node.isroot) {
          node.expanded = false
          c++;
        }
      }
      if (c > 0) {
        var root = this.jm.mind.root;
        this.part_layout(root);
        this.set_visible(root.children, true);
      }
    },

    expand_to_depth: function(target_depth, curr_nodes, curr_depth) {
      if (target_depth < 1) { return; }
      var nodes = curr_nodes || this.jm.mind.root.children;
      var depth = curr_depth || 1;
      var i = nodes.length;
      var node = null;
      while (i--) {
        node = nodes[i];
        if (depth < target_depth) {
          if (!node.expanded) {
            this.expand_node(node);
          }
          this.expand_to_depth(target_depth, node.children, depth + 1);
        }
        if (depth == target_depth) {
          if (node.expanded) {
            this.collapse_node(node);
          }
        }
      }
    },

    part_layout: function(node) {
      var root = this.jm.mind.root;
      if (!!root) {
        var root_layout_data = root._data.layout;
        if (node.isroot) {
          root_layout_data.outer_height_right = this._layout_offset_subnodes_height(root_layout_data.right_nodes);
          root_layout_data.outer_height_left = this._layout_offset_subnodes_height(root_layout_data.left_nodes);
        } else {
          if (node._data.layout.direction == jm.direction.right) {
            root_layout_data.outer_height_right = this._layout_offset_subnodes_height(root_layout_data.right_nodes);
          } else {
            root_layout_data.outer_height_left = this._layout_offset_subnodes_height(root_layout_data.left_nodes);
          }
        }
        this.bounds.s = Math.max(root_layout_data.outer_height_left, root_layout_data.outer_height_right);
        this.cache_valid = false;
      } else {
        logger.warn('can not found root node');
      }
    },

    set_visible: function(nodes, visible) {
      var i = nodes.length;
      var node = null;
      var layout_data = null;
      while (i--) {
        node = nodes[i];
        layout_data = node._data.layout;
        if (node.expanded) {
          this.set_visible(node.children, visible);
        } else {
          this.set_visible(node.children, false);
        }
        if (!node.isroot) {
          node._data.layout.visible = visible;
        }
      }
    },

    is_expand: function(node) {
      return node.expanded;
    },

    is_visible: function(node) {
      var layout_data = node._data.layout;
      if (('visible' in layout_data) && !layout_data.visible) {
        return false;
      } else {
        return true;
      }
    },
  };

  // view provider
  jm.view_provider = function(jm, options) {
    this.opts = options;
    this.jm = jm;
    this.layout = jm.layout;

    this.container = null;
    this.e_panel = null;
    this.e_nodes = null;
    this.e_canvas = null;

    this.canvas_ctx = null;
    this.size = { w: 0, h: 0 };

    this.selected_node = null;
    this.editing_node = null;
  };

  jm.view_provider.prototype = {
    init: function() {
      logger.debug('view.init');

      this.container = $i(this.opts.container) ? this.opts.container : $g(this.opts.container);
      if (!this.container) {
        logger.error('the options.view.container was not be found in dom');
        return;
      }
      this.e_panel = $c('div');
      this.e_canvas = $c('canvas');
      this.e_nodes = $c('jmnodes');
      this.e_editor = $c('input');

      this.e_panel.className = 'jsmind-inner';
      this.e_panel.appendChild(this.e_canvas);
      this.e_panel.appendChild(this.e_nodes);

      this.e_editor.className = 'jsmind-editor';
      this.e_editor.type = 'text';

      this.actualZoom = 1;
      this.zoomStep = 0.1;
      this.minZoom = 0.5;
      this.maxZoom = 2;

      var v = this;
      jm.util.dom.add_event(this.e_editor, 'keydown', function(e) {
        var evt = e || event;
        if (evt.keyCode == 13) {
          v.edit_node_end();
          evt.stopPropagation();
        }
      });
      jm.util.dom.add_event(this.e_editor, 'blur', function(e) {
        v.edit_node_end();
      });

      this.container.appendChild(this.e_panel);

      this.init_canvas();
    },

    add_event: function(obj, event_name, event_handle) {
      jm.util.dom.add_event(this.e_nodes, event_name, function(e) {
        var evt = e || event;
        event_handle.call(obj, evt);
      });
    },

    get_binded_nodeid: function(element) {
      if (element == null) {
        return null;
      }
      var tagName = element.tagName.toLowerCase();
      if (tagName == 'jmnodes' || tagName == 'body' || tagName == 'html') {
        return null;
      }
      if (tagName == 'jmnode' || tagName == 'jmexpander') {
        return element.getAttribute('nodeid');
      } else {
        return this.get_binded_nodeid(element.parentElement);
      }
    },

    is_expander: function(element) {
      return (element.tagName.toLowerCase() == 'jmexpander');
    },

    reset: function() {
      logger.debug('view.reset');
      this.selected_node = null;
      this.clear_lines();
      this.clear_nodes();
      this.reset_theme();
    },

    reset_theme: function() {
      var theme_name = this.jm.options.theme;
      if (!!theme_name) {
        this.e_nodes.className = 'theme-' + theme_name;
      } else {
        this.e_nodes.className = '';
      }
    },

    reset_custom_style: function() {
      var nodes = this.jm.mind.nodes;
      for (var nodeid in nodes) {
        this.reset_node_custom_style(nodes[nodeid]);
      }
    },

    load: function() {
      logger.debug('view.load');
      this.init_nodes();
    },

    expand_size: function() {
      var min_size = this.layout.get_min_size();
      var min_width = min_size.w + this.opts.hmargin * 2;
      var min_height = min_size.h + this.opts.vmargin * 2;
      var client_w = this.e_panel.clientWidth;
      var client_h = this.e_panel.clientHeight;
      if (client_w < min_width) { client_w = min_width; }
      if (client_h < min_height) { client_h = min_height; }
      this.size.w = client_w;
      this.size.h = client_h;
    },

    init_canvas: function() {
      var ctx = this.e_canvas.getContext('2d');
      this.canvas_ctx = ctx;
    },

    init_nodes_size: function(node) {
      var view_data = node._data.view;
      view_data.width = view_data.element.clientWidth;
      view_data.height = view_data.element.clientHeight;
    },

    init_nodes: function() {
      var nodes = this.jm.mind.nodes;
      var doc_frag = $d.createDocumentFragment();
      for (var nodeid in nodes) {
        this.create_node_element(nodes[nodeid], doc_frag);
      }
      this.e_nodes.appendChild(doc_frag);
      for (var nodeid in nodes) {
        this.init_nodes_size(nodes[nodeid]);
      }
    },

    add_node: function(node) {
      this.create_node_element(node, this.e_nodes);
      this.init_nodes_size(node);
    },

    create_node_element: function(node, parent_node) {
      var view_data = null;
      if ('view' in node._data) {
        view_data = node._data.view;
      } else {
        view_data = {};
        node._data.view = view_data;
      }

      var d = $c('jmnode');
      if (node.isroot) {
        d.className = 'root';
      } else {
        var d_e = $c('jmexpander'); // 右侧的小东西
        $t(d_e, '-');
        d_e.setAttribute('nodeid', node.id);
        d_e.style.visibility = 'hidden';
        parent_node.appendChild(d_e);
        view_data.expander = d_e;
      }
      if (!!node.topic) {
        if (this.opts.support_html) {
          $h(d, node.topic);
        } else {
          $t(d, node.topic);
        }
      }

      // 创建右上角的小图标 雕漆里
      var badge = $c('div');
      badge.className = 'leo-badge'
      parent_node.appendChild(badge);
      $t(badge, node._data.badge)
      badge.setAttribute('nodeid', node.id);
      badge.style.visibility = 'hidden';
      view_data.badge = badge;


      d.setAttribute('nodeid', node.id);
      d.style.visibility = 'hidden';
      this._reset_node_custom_style(d, node.data);

      parent_node.appendChild(d);
      view_data.element = d;
    },

    remove_node: function(node) {
      if (this.selected_node != null && this.selected_node.id == node.id) {
        this.selected_node = null;
      }
      if (this.editing_node != null && this.editing_node.id == node.id) {
        node._data.view.element.removeChild(this.e_editor);
        this.editing_node = null;
      }
      var children = node.children;
      var i = children.length;
      while (i--) {
        this.remove_node(children[i]);
      }
      if (node._data.view) {
        var element = node._data.view.element;
        var expander = node._data.view.expander;
        this.e_nodes.removeChild(element);
        this.e_nodes.removeChild(expander);
        node._data.view.element = null;
        node._data.view.expander = null;
      }
    },

    update_node: function(node) {
      var view_data = node._data.view;
      var element = view_data.element;
      if (!!node.topic) {
        if (this.opts.support_html) {
          $h(element, node.topic);
        } else {
          $t(element, node.topic);
        }
      }
      view_data.width = element.clientWidth;
      view_data.height = element.clientHeight;
    },

    select_node: function(node) {
      if (!!this.selected_node) {
        this.selected_node._data.view.element.className =
          this.selected_node._data.view.element.className.replace(/\s*selected\b/i, '');
        this.reset_node_custom_style(this.selected_node);
      }
      if (!!node) {
        this.selected_node = node;
        node._data.view.element.className += ' selected';
        this.clear_node_custom_style(node);
      }
    },

    select_clear: function() {
      this.select_node(null);
    },

    get_editing_node: function() {
      return this.editing_node;
    },

    is_editing: function() {
      return (!!this.editing_node);
    },

    edit_node_begin: function(node) {
      if (!node.topic) {
        logger.warn("don't edit image nodes");
        return;
      }
      if (this.editing_node != null) {
        this.edit_node_end();
      }
      this.editing_node = node;
      var view_data = node._data.view;
      var element = view_data.element;
      var topic = node.topic;
      var ncs = getComputedStyle(element);
      this.e_editor.value = topic;
      this.e_editor.style.width = (element.clientWidth - parseInt(ncs.getPropertyValue('padding-left')) - parseInt(ncs.getPropertyValue('padding-right'))) + 'px';
      element.innerHTML = '';
      element.appendChild(this.e_editor);
      element.style.zIndex = 5;
      this.e_editor.focus();
      this.e_editor.select();
    },

    edit_node_end: function() {
      if (this.editing_node != null) {
        var node = this.editing_node;
        this.editing_node = null;
        var view_data = node._data.view;
        var element = view_data.element;
        var topic = this.e_editor.value;
        element.style.zIndex = 'auto';
        element.removeChild(this.e_editor);
        if (jm.util.text.is_empty(topic) || node.topic === topic) {
          if (this.opts.support_html) {
            $h(element, node.topic);
          } else {
            $t(element, node.topic);
          }
        } else {
          this.jm.update_node(node.id, topic);
        }
      }
    },

    get_view_offset: function() {
      var bounds = this.layout.bounds;
      var _x = (this.size.w - bounds.e - bounds.w) / 2;
      var _y = this.size.h / 2;
      return { x: _x, y: _y };
    },

    resize: function() {
      this.e_canvas.width = 1;
      this.e_canvas.height = 1;
      this.e_nodes.style.width = '1px';
      this.e_nodes.style.height = '1px';

      this.expand_size();
      this._show();
    },

    _show: function() {
      this.e_canvas.width = this.size.w;
      this.e_canvas.height = this.size.h;
      this.e_nodes.style.width = this.size.w + 'px';
      this.e_nodes.style.height = this.size.h + 'px';
      this.show_nodes();
      this.show_lines();
      //this.layout.cache_valid = true;
      this.jm.invoke_event_handle(jm.event_type.resize, { data: [] });
    },

    zoomIn: function() {
      return this.setZoom(this.actualZoom + this.zoomStep);
    },

    zoomOut: function() {
      return this.setZoom(this.actualZoom - this.zoomStep);
    },

    setZoom: function(zoom) {
      if ((zoom < this.minZoom) || (zoom > this.maxZoom)) {
        return false;
      }
      this.actualZoom = zoom;
      for (var i = 0; i < this.e_panel.children.length; i++) {
        this.e_panel.children[i].style.transform = 'scale(' + zoom + ')';
      };
      this.show(true);
      return true;

    },

    _center_root: function() {
      // center root node
      var outer_w = this.e_panel.clientWidth;
      var outer_h = this.e_panel.clientHeight;
      if (this.size.w > outer_w) {
        var _offset = this.get_view_offset();
        this.e_panel.scrollLeft = _offset.x - outer_w / 2;
      }
      if (this.size.h > outer_h) {
        this.e_panel.scrollTop = (this.size.h - outer_h) / 2;
      }
    },

    show: function(keep_center) {
      logger.debug('view.show');
      this.expand_size();
      this._show();
      if (!!keep_center) {
        this._center_root();
      }
    },

    relayout: function() {
      this.expand_size();
      this._show();
    },

    save_location: function(node) {
      var vd = node._data.view;
      vd._saved_location = {
        x: parseInt(vd.element.style.left) - this.e_panel.scrollLeft,
        y: parseInt(vd.element.style.top) - this.e_panel.scrollTop,
      };
    },

    restore_location: function(node) {
      var vd = node._data.view;
      this.e_panel.scrollLeft = parseInt(vd.element.style.left) - vd._saved_location.x;
      this.e_panel.scrollTop = parseInt(vd.element.style.top) - vd._saved_location.y;
    },

    clear_nodes: function() {
      var mind = this.jm.mind;
      if (mind == null) {
        return;
      }
      var nodes = mind.nodes;
      var node = null;
      for (var nodeid in nodes) {
        node = nodes[nodeid];
        node._data.view.element = null;
        node._data.view.expander = null;
      }
      this.e_nodes.innerHTML = '';
    },

    show_nodes: function() {
      var nodes = this.jm.mind.nodes;
      var node = null;
      var node_element = null;
      var expander = null;
      var p = null;
      var p_expander = null;
      var expander_text = '-';
      var view_data = null;
      var _offset = this.get_view_offset();
      for (var nodeid in nodes) {
        node = nodes[nodeid];
        view_data = node._data.view;
        node_element = view_data.element;
        expander = view_data.expander;
        if (!this.layout.is_visible(node)) {
          node_element.style.display = 'none';
          expander.style.display = 'none';
          continue;
        }
        this.reset_node_custom_style(node);
        p = this.layout.get_node_point(node);
        view_data.abs_x = _offset.x + p.x;
        view_data.abs_y = _offset.y + p.y;
        node_element.style.left = (_offset.x + p.x) + 'px';
        node_element.style.top = (_offset.y + p.y) + 'px';
        node_element.style.display = '';
        node_element.style.visibility = 'visible';

        p_expander = this.layout.get_expander_point(node);

        // 创建右侧expander收缩按钮
        if (!node.isroot && node.children.length > 0) {
          expander_text = node.expanded ? '-' : '+';
          expander.style.left = (_offset.x + p_expander.x) + 'px';
          expander.style.top = (_offset.y + p_expander.y) + 'px';
          expander.style.display = '';
          expander.style.visibility = 'visible';
          $t(expander, expander_text);
        }
        // 当下面已经没有children时，隐藏expander收缩按钮
        if (!node.isroot && node.children.length == 0) {
          expander.style.display = 'none';
          expander.style.visibility = 'hidden';
        }
        // 创建右上角的小图标 丢那妈
        if (!node.data.badge || node.data.badge < 1) continue;
        var badge = view_data.badge;
        badge.style.left = (_offset.x + p_expander.x - 10) + 'px';
        badge.style.top = (_offset.y + p_expander.y - 20) + 'px';
        badge.style.display = '';
        badge.style.visibility = 'visible';
        $t(badge, node.data.badge);
      }
    },

    reset_node_custom_style: function(node) {
      this._reset_node_custom_style(node._data.view.element, node.data);
    },

    _reset_node_custom_style: function(node_element, node_data) {
      if ('background-color' in node_data) {
        node_element.style.backgroundColor = node_data['background-color'];
      }
      if ('foreground-color' in node_data) {
        node_element.style.color = node_data['foreground-color'];
      }
      if ('width' in node_data) {
        node_element.style.width = node_data['width'] + 'px';
      }
      if ('height' in node_data) {
        node_element.style.height = node_data['height'] + 'px';
      }
      if ('font-size' in node_data) {
        node_element.style.fontSize = node_data['font-size'] + 'px';
      }
      if ('font-weight' in node_data) {
        node_element.style.fontWeight = node_data['font-weight'];
      }
      if ('font-style' in node_data) {
        node_element.style.fontStyle = node_data['font-style'];
      }
      if ('background-image' in node_data) {
        var backgroundImage = node_data['background-image'];
        if (backgroundImage.startsWith('data') && node_data['width'] && node_data['height']) {
          var img = new Image();

          img.onload = function() {
            var c = $c('canvas');
            c.width = node_element.clientWidth;
            c.height = node_element.clientHeight;
            var img = this;
            if (c.getContext) {
              var ctx = c.getContext('2d');
              ctx.drawImage(img, 2, 2, node_element.clientWidth, node_element.clientHeight);
              var scaledImageData = c.toDataURL();
              node_element.style.backgroundImage = 'url(' + scaledImageData + ')';
            }
          };
          img.src = backgroundImage;

        } else {
          node_element.style.backgroundImage = 'url(' + backgroundImage + ')';
        }
        node_element.style.backgroundSize = '99%';

        if ('background-rotation' in node_data) {
          node_element.style.transform = 'rotate(' + node_data['background-rotation'] + 'deg)';
        }

      }
    },

    clear_node_custom_style: function(node) {
      var node_element = node._data.view.element;
      node_element.style.backgroundColor = "";
      node_element.style.color = "";
    },

    clear_lines: function(canvas_ctx) {
      var ctx = canvas_ctx || this.canvas_ctx;
      jm.util.canvas.clear(ctx, 0, 0, this.size.w, this.size.h);
    },

    show_lines: function(canvas_ctx) {
      this.clear_lines(canvas_ctx);
      var nodes = this.jm.mind.nodes;
      var node = null;
      var pin = null;
      var pout = null;
      var _offset = this.get_view_offset();
      for (var nodeid in nodes) {
        node = nodes[nodeid];
        if (!!node.isroot) { continue; }
        if (('visible' in node._data.layout) && !node._data.layout.visible) { continue; }
        pin = this.layout.get_node_point_in(node);
        pout = this.layout.get_node_point_out(node.parent);
        this.draw_line(pout, pin, _offset, canvas_ctx);
      }
    },

    draw_line: function(pin, pout, offset, canvas_ctx) {
      var ctx = canvas_ctx || this.canvas_ctx;
      ctx.strokeStyle = this.opts.line_color;
      ctx.lineWidth = this.opts.line_width;
      ctx.lineCap = 'round';

      jm.util.canvas.bezierto(
        ctx,
        pin.x + offset.x,
        pin.y + offset.y,
        pout.x + offset.x,
        pout.y + offset.y);
    },
  };

  // shortcut provider
  jm.shortcut_provider = function(jm, options) {
    this.jm = jm;
    this.opts = options;
    this.mapping = options.mapping;
    this.handles = options.handles;
    this._mapping = {};
  };

  jm.shortcut_provider.prototype = {
    init: function() {
      jm.util.dom.add_event($d, 'keydown', this.handler.bind(this));

      this.handles['addchild'] = this.handle_addchild;
      this.handles['addbrother'] = this.handle_addbrother;
      this.handles['editnode'] = this.handle_editnode;
      this.handles['delnode'] = this.handle_delnode;
      this.handles['toggle'] = this.handle_toggle;
      this.handles['up'] = this.handle_up;
      this.handles['down'] = this.handle_down;
      this.handles['left'] = this.handle_left;
      this.handles['right'] = this.handle_right;

      for (var handle in this.mapping) {
        if (!!this.mapping[handle] && (handle in this.handles)) {
          this._mapping[this.mapping[handle]] = this.handles[handle];
        }
      }
    },

    enable_shortcut: function() {
      this.opts.enable = true;
    },

    disable_shortcut: function() {
      this.opts.enable = false;
    },

    handler: function(e) {
      if (this.jm.view.is_editing()) { return; }
      var evt = e || event;
      if (!this.opts.enable) { return true; }
      var kc = evt.keyCode;
      if (kc in this._mapping) {
        this._mapping[kc].call(this, this.jm, e);
      }
    },

    handle_addchild: function(_jm, e) {
      var selected_node = _jm.get_selected_node();
      if (!!selected_node) {
        var nodeid = jm.util.uuid.newid();
        var node = _jm.add_node(selected_node, nodeid, 'New Node');
        if (!!node) {
          _jm.select_node(nodeid);
          _jm.begin_edit(nodeid);
        }
      }
    },
    handle_addbrother: function(_jm, e) {
      var selected_node = _jm.get_selected_node();
      if (!!selected_node && !selected_node.isroot) {
        var nodeid = jm.util.uuid.newid();
        var node = _jm.insert_node_after(selected_node, nodeid, 'New Node');
        if (!!node) {
          _jm.select_node(nodeid);
          _jm.begin_edit(nodeid);
        }
      }
    },
    handle_editnode: function(_jm, e) {
      var selected_node = _jm.get_selected_node();
      if (!!selected_node) {
        _jm.begin_edit(selected_node);
      }
    },
    handle_delnode: function(_jm, e) {
      var selected_node = _jm.get_selected_node();
      if (!!selected_node && !selected_node.isroot) {
        _jm.select_node(selected_node.parent);
        _jm.remove_node(selected_node);
      }
    },
    handle_toggle: function(_jm, e) {
      var evt = e || event;
      var selected_node = _jm.get_selected_node();
      if (!!selected_node) {
        _jm.toggle_node(selected_node.id);
        evt.stopPropagation();
        evt.preventDefault();
      }
    },
    handle_up: function(_jm, e) {
      var evt = e || event;
      var selected_node = _jm.get_selected_node();
      if (!!selected_node) {
        var up_node = _jm.find_node_before(selected_node);
        if (!up_node) {
          var np = _jm.find_node_before(selected_node.parent);
          if (!!np && np.children.length > 0) {
            up_node = np.children[np.children.length - 1];
          }
        }
        if (!!up_node) {
          _jm.select_node(up_node);
        }
        evt.stopPropagation();
        evt.preventDefault();
      }
    },

    handle_down: function(_jm, e) {
      var evt = e || event;
      var selected_node = _jm.get_selected_node();
      if (!!selected_node) {
        var down_node = _jm.find_node_after(selected_node);
        if (!down_node) {
          var np = _jm.find_node_after(selected_node.parent);
          if (!!np && np.children.length > 0) {
            down_node = np.children[0];
          }
        }
        if (!!down_node) {
          _jm.select_node(down_node);
        }
        evt.stopPropagation();
        evt.preventDefault();
      }
    },

    handle_left: function(_jm, e) {
      this._handle_direction(_jm, e, jm.direction.left);
    },
    handle_right: function(_jm, e) {
      this._handle_direction(_jm, e, jm.direction.right);
    },
    _handle_direction: function(_jm, e, d) {
      var evt = e || event;
      var selected_node = _jm.get_selected_node();
      var node = null;
      if (!!selected_node) {
        if (selected_node.isroot) {
          var c = selected_node.children;
          var children = [];
          for (var i = 0; i < c.length; i++) {
            if (c[i].direction === d) {
              children.push(i)
            }
          }
          node = c[children[Math.floor((children.length - 1) / 2)]];
        } else if (selected_node.direction === d) {
          var children = selected_node.children;
          var childrencount = children.length;
          if (childrencount > 0) {
            node = children[Math.floor((childrencount - 1) / 2)]
          }
        } else {
          node = selected_node.parent;
        }
        if (!!node) {
          _jm.select_node(node);
        }
        evt.stopPropagation();
        evt.preventDefault();
      }
    },
  };


  // plugin
  jm.plugin = function(name, init) {
    this.name = name;
    this.init = init;
  };

  jm.plugins = [];

  jm.register_plugin = function(plugin) {
    if (plugin instanceof jm.plugin) {
      jm.plugins.push(plugin);
    }
  };

  jm.init_plugins = function(sender) {
    $w.setTimeout(function() {
      jm._init_plugins(sender);
    }, 0);
  };

  jm._init_plugins = function(sender) {
    var l = jm.plugins.length;
    var fn_init = null;
    for (var i = 0; i < l; i++) {
      fn_init = jm.plugins[i].init;
      if (typeof fn_init === 'function') {
        fn_init(sender);
      }
    }
  };

  // quick way
  jm.show = function(options, mind) {
    var _jm = new jm(options);
    _jm.show(mind);
    return _jm;
  };

  $w[__name__] = jm;
})(window);



/*
 * Released under BSD License
 * Copyright (c) 2014-2015 hizzgdev@163.com
 *
 * Project Home:
 *   https://github.com/hizzgdev/jsmind/
 */
(function($w) {
  'use strict';
  var $d = $w.document;
  var __name__ = 'jsMind';
  var jsMind = $w[__name__];
  if (!jsMind) { return; }
  if (typeof jsMind.draggable != 'undefined') { return; }

  var jdom = jsMind.util.dom;
  var jcanvas = jsMind.util.canvas;

  var clear_selection = 'getSelection' in $w ? function() {
    $w.getSelection().removeAllRanges();
  } : function() {
    $d.selection.empty();
  };

  var options = {
    line_width: 5,
    lookup_delay: 500,
    lookup_interval: 80
  };

  jsMind.draggable = function(jm) {
    this.jm = jm;
    this.e_canvas = null;
    this.canvas_ctx = null;
    this.shadow = null;
    this.shadow_w = 0;
    this.shadow_h = 0;
    this.active_node = null;
    this.target_node = null;
    this.target_direct = null;
    this.client_w = 0;
    this.client_h = 0;
    this.offset_x = 0;
    this.offset_y = 0;
    this.hlookup_delay = 0;
    this.hlookup_timer = 0;
    this.capture = false;
    this.moved = false;
  };

  jsMind.draggable.prototype = {
    init: function() {
      this._create_canvas();
      this._create_shadow();
      this._event_bind();
    },

    resize: function() {
      this.jm.view.e_nodes.appendChild(this.shadow);
      this.e_canvas.width = this.jm.view.size.w;
      this.e_canvas.height = this.jm.view.size.h;
    },

    _create_canvas: function() {
      var c = $d.createElement('canvas');
      this.jm.view.e_panel.appendChild(c);
      var ctx = c.getContext('2d');
      this.e_canvas = c;
      this.canvas_ctx = ctx;
    },

    _create_shadow: function() {
      var s = $d.createElement('jmnode');
      s.style.visibility = 'hidden';
      s.style.zIndex = '3';
      s.style.cursor = 'move';
      s.style.opacity = '0.7';
      this.shadow = s;
    },

    reset_shadow: function(el) {
      var s = this.shadow.style;
      this.shadow.innerHTML = el.innerHTML;
      s.left = el.style.left;
      s.top = el.style.top;
      s.width = el.style.width;
      s.height = el.style.height;
      s.backgroundImage = el.style.backgroundImage;
      s.backgroundSize = el.style.backgroundSize;
      s.transform = el.style.transform;
      this.shadow_w = this.shadow.clientWidth;
      this.shadow_h = this.shadow.clientHeight;

    },

    show_shadow: function() {
      if (!this.moved) {
        this.shadow.style.visibility = 'visible';
      }
    },

    hide_shadow: function() {
      this.shadow.style.visibility = 'hidden';
    },

    clear_lines: function() {
      jcanvas.clear(this.canvas_ctx, 0, 0, this.jm.view.size.w, this.jm.view.size.h);
    },

    _magnet_shadow: function(node) {
      if (!!node) {
        this.canvas_ctx.lineWidth = options.line_width;
        this.canvas_ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        this.canvas_ctx.lineCap = 'round';
        this.clear_lines();
        jcanvas.lineto(this.canvas_ctx,
          node.sp.x,
          node.sp.y,
          node.np.x,
          node.np.y);
      }
    },

    _lookup_close_node: function() {
      var root = this.jm.get_root();
      var root_location = root.get_location();
      var root_size = root.get_size();
      var root_x = root_location.x + root_size.w / 2;

      var sw = this.shadow_w;
      var sh = this.shadow_h;
      var sx = this.shadow.offsetLeft;
      var sy = this.shadow.offsetTop;

      var ns, nl;

      var direct = (sx + sw / 2) >= root_x ?
        jsMind.direction.right : jsMind.direction.left;
      var nodes = this.jm.mind.nodes;
      var node = null;
      var min_distance = Number.MAX_VALUE;
      var distance = 0;
      var closest_node = null;
      var closest_p = null;
      var shadow_p = null;
      for (var nodeid in nodes) {
        var np, sp;
        node = nodes[nodeid];
        if (node.isroot || node.direction == direct) {
          if (node.id == this.active_node.id) {
            continue;
          }
          ns = node.get_size();
          nl = node.get_location();
          if (direct == jsMind.direction.right) {
            if (sx - nl.x - ns.w <= 0) { continue; }
            distance = Math.abs(sx - nl.x - ns.w) + Math.abs(sy + sh / 2 - nl.y - ns.h / 2);
            np = { x: nl.x + ns.w - options.line_width, y: nl.y + ns.h / 2 };
            sp = { x: sx + options.line_width, y: sy + sh / 2 };
          } else {
            if (nl.x - sx - sw <= 0) { continue; }
            distance = Math.abs(sx + sw - nl.x) + Math.abs(sy + sh / 2 - nl.y - ns.h / 2);
            np = { x: nl.x + options.line_width, y: nl.y + ns.h / 2 };
            sp = { x: sx + sw - options.line_width, y: sy + sh / 2 };
          }
          if (distance < min_distance) {
            closest_node = node;
            closest_p = np;
            shadow_p = sp;
            min_distance = distance;
          }
        }
      }
      var result_node = null;
      if (!!closest_node) {
        result_node = {
          node: closest_node,
          direction: direct,
          sp: shadow_p,
          np: closest_p
        };
      }
      return result_node;
    },

    lookup_close_node: function() {
      var node_data = this._lookup_close_node();
      if (!!node_data) {
        this._magnet_shadow(node_data);
        this.target_node = node_data.node;
        this.target_direct = node_data.direction;
      }
    },

    _event_bind: function() {
      var jd = this;
      var container = this.jm.view.container;
      // 鼠标右键 (leo 加的)
      jdom.add_event(container, 'contextmenu', function(e) {
        // console.log('鼠标右键')
        var evt = e || event;
        jd.dragend.call(jd, evt);
      });
      // 鼠标按下
      jdom.add_event(container, 'mousedown', function(e) {
        // console.log('鼠标按下')
        $conTextMenu.hide();
        var evt = e || event;
        jd.dragstart.call(jd, evt);
      });
      // 鼠标移动
      jdom.add_event(container, 'mousemove', function(e) {
        // console.log('鼠标移动')
        var evt = e || event;
        jd.drag.call(jd, evt);
      });
      // 鼠标弹起
      jdom.add_event(container, 'mouseup', function(e) {
        // console.log('鼠标弹起')
        var evt = e || event;
        jd.dragend.call(jd, evt);
      });
      jdom.add_event(container, 'touchstart', function(e) {
        // console.log('touchstart')
        var evt = e || event;
        jd.dragstart.call(jd, evt);
      });
      jdom.add_event(container, 'touchmove', function(e) {
        // console.log('touchmove')
        var evt = e || event;
        jd.drag.call(jd, evt);
      });
      jdom.add_event(container, 'touchend', function(e) {
        // console.log('touchend')
        var evt = e || event;
        jd.dragend.call(jd, evt);
      });
    },

    dragstart: function(e) {
      if (!this.jm.get_editable()) { return; }
      if (this.capture) { return; }
      this.active_node = null;

      var jview = this.jm.view;
      var el = e.target || event.srcElement;
      if (el.tagName.toLowerCase() != 'jmnode') { return; }
      var nodeid = jview.get_binded_nodeid(el);
      if (!!nodeid) {
        var node = this.jm.get_node(nodeid);
        if (!node.isroot) {
          this.reset_shadow(el);
          this.active_node = node;
          this.offset_x = (e.clientX || e.touches[0].clientX) - el.offsetLeft;
          this.offset_y = (e.clientY || e.touches[0].clientY) - el.offsetTop;
          this.client_hw = Math.floor(el.clientWidth / 2);
          this.client_hh = Math.floor(el.clientHeight / 2);
          if (this.hlookup_delay != 0) {
            $w.clearTimeout(this.hlookup_delay);
          }
          if (this.hlookup_timer != 0) {
            $w.clearInterval(this.hlookup_timer);
          }
          var jd = this;
          this.hlookup_delay = $w.setTimeout(function() {
            jd.hlookup_delay = 0;
            jd.hlookup_timer = $w.setInterval(function() {
              jd.lookup_close_node.call(jd);
            }, options.lookup_interval);
          }, options.lookup_delay);
          this.capture = true;
        }
      }
    },

    drag: function(e) {
      if (!this.jm.get_editable()) { return; }
      if (this.capture) {
        e.preventDefault();
        this.show_shadow();
        this.moved = true;
        clear_selection();
        var px = (e.clientX || e.touches[0].clientX) - this.offset_x;
        var py = (e.clientY || e.touches[0].clientY) - this.offset_y;
        var cx = px + this.client_hw;
        var cy = py + this.client_hh;
        this.shadow.style.left = px + 'px';
        this.shadow.style.top = py + 'px';
        clear_selection();
      }
    },

    dragend: function(e) {
      if (!this.jm.get_editable()) { return; }
      if (this.capture) {
        if (this.hlookup_delay != 0) {
          $w.clearTimeout(this.hlookup_delay);
          this.hlookup_delay = 0;
          this.clear_lines();
        }
        if (this.hlookup_timer != 0) {
          $w.clearInterval(this.hlookup_timer);
          this.hlookup_timer = 0;
          this.clear_lines();
        }
        if (this.moved) {
          var src_node = this.active_node;
          var target_node = this.target_node;
          var target_direct = this.target_direct;
          this.move_node(src_node, target_node, target_direct);
        }
        this.hide_shadow();
      }
      this.moved = false;
      this.capture = false;
    },

    move_node: function(src_node, target_node, target_direct) {
      var shadow_h = this.shadow.offsetTop;
      if (!!target_node && !!src_node && !jsMind.node.inherited(src_node, target_node)) {
        // lookup before_node
        var sibling_nodes = target_node.children;
        var sc = sibling_nodes.length;
        var node = null;
        var delta_y = Number.MAX_VALUE;
        var node_before = null;
        var beforeid = '_last_';
        while (sc--) {
          node = sibling_nodes[sc];
          if (node.direction == target_direct && node.id != src_node.id) {
            var dy = node.get_location().y - shadow_h;
            if (dy > 0 && dy < delta_y) {
              delta_y = dy;
              node_before = node;
              beforeid = '_first_';
            }
          }
        }
        if (!!node_before) { beforeid = node_before.id; }
        this.jm.move_node(src_node.id, beforeid, target_node.id, target_direct);
      }
      this.active_node = null;
      this.target_node = null;
      this.target_direct = null;
    },

    jm_event_handle: function(type, data) {
      if (type === jsMind.event_type.resize) {
        this.resize();
      }
    }
  };

  var draggable_plugin = new jsMind.plugin('draggable', function(jm) {
    var jd = new jsMind.draggable(jm);
    jd.init();
    jm.add_event_listener(function(type, data) {
      jd.jm_event_handle.call(jd, type, data);
    });
  });

  jsMind.register_plugin(draggable_plugin);

})(window);


/*
 * Released under BSD License
 * Copyright (c) 2014-2015 hizzgdev@163.com
 *
 * Project Home:
 *   https://github.com/hizzgdev/jsmind/
 */

(function($w) {
  'use strict';

  var __name__ = 'jsMind';
  var jsMind = $w[__name__];
  if (!jsMind) { return; }
  if (typeof jsMind.screenshot != 'undefined') { return; }

  var $d = $w.document;
  var $c = function(tag) { return $d.createElement(tag); };

  var css = function(cstyle, property_name) {
    return cstyle.getPropertyValue(property_name);
  };
  var is_visible = function(cstyle) {
    var visibility = css(cstyle, 'visibility');
    var display = css(cstyle, 'display');
    return (visibility !== 'hidden' && display !== 'none');
  };
  var jcanvas = jsMind.util.canvas;
  jcanvas.rect = function(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  };

  jcanvas.text_multiline = function(ctx, text, x, y, w, h, lineheight) {
    var line = '';
    var text_len = text.length;
    var chars = text.split('');
    var test_line = null;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (var i = 0; i < text_len; i++) {
      test_line = line + chars[i];
      if (ctx.measureText(test_line).width > w && i > 0) {
        ctx.fillText(line, x, y);
        line = chars[i];
        y += lineheight;
      } else {
        line = test_line;
      }
    }
    ctx.fillText(line, x, y);
  };

  jcanvas.text_ellipsis = function(ctx, text, x, y, w, h) {
    var center_y = y + h / 2;
    var text = jcanvas.fittingString(ctx, text, w);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, center_y, w);
  };

  jcanvas.fittingString = function(ctx, text, max_width) {
    var width = ctx.measureText(text).width;
    var ellipsis = '…'
    var ellipsis_width = ctx.measureText(ellipsis).width;
    if (width <= max_width || width <= ellipsis_width) {
      return text;
    } else {
      var len = text.length;
      while (width >= max_width - ellipsis_width && len-- > 0) {
        text = text.substring(0, len);
        width = ctx.measureText(text).width;
      }
      return text + ellipsis;
    }
  };

  jcanvas.image = function(ctx, backgroundUrl, x, y, w, h, r, rotation, callback) {
    var img = new Image();
    img.onload = function() {
      ctx.save();
      ctx.translate(x, y);
      ctx.save();
      ctx.beginPath();
      jcanvas.rect(ctx, 0, 0, w, h, r);
      ctx.closePath();
      ctx.clip();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.drawImage(img, -w / 2, -h / 2);
      ctx.restore();
      ctx.restore();
      callback();
    }
    img.src = backgroundUrl;
  };

  jsMind.screenshot = function(jm) {
    this.jm = jm;
    this.canvas_elem = null;
    this.canvas_ctx = null;
    this._inited = false;
  };

  jsMind.screenshot.prototype = {
    init: function() {
      if (this._inited) { return; }
      console.log('init');
      var c = $c('canvas');
      var ctx = c.getContext('2d');

      this.canvas_elem = c;
      this.canvas_ctx = ctx;
      this.jm.view.e_panel.appendChild(c);
      this._inited = true;
      this.resize();
    },

    shoot: function(callback) {
      this.init();
      this._watermark();
      var jms = this;
      this._draw(function() {
        if (!!callback) {
          callback(jms);
        }
        jms.clean();
      });
    },

    shootDownload: function() {
      this.shoot(function(jms) {
        jms._download();
      });
    },

    shootAsDataURL: function(callback) {
      this.shoot(function(jms) {
        callback(jms.canvas_elem.toDataURL());
      });
    },

    resize: function() {
      if (this._inited) {
        this.canvas_elem.width = this.jm.view.size.w;
        this.canvas_elem.height = this.jm.view.size.h;
      }
    },

    clean: function() {
      var c = this.canvas_elem;
      this.canvas_ctx.clearRect(0, 0, c.width, c.height);
    },

    _draw: function(callback) {
      var ctx = this.canvas_ctx;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      this._draw_lines();
      this._draw_nodes(callback);
    },

    _watermark: function() {
      var c = this.canvas_elem;
      var ctx = this.canvas_ctx;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#000';
      ctx.font = '11px Verdana,Arial,Helvetica,sans-serif';
      ctx.fillText('hizzgdev.github.io/jsmind', c.width - 5.5, c.height - 2.5);
      ctx.textAlign = 'left';
      ctx.fillText($w.location, 5.5, c.height - 2.5);
    },

    _draw_lines: function() {
      this.jm.view.show_lines(this.canvas_ctx);
    },

    _draw_nodes: function(callback) {
      var nodes = this.jm.mind.nodes;
      var node;
      for (var nodeid in nodes) {
        node = nodes[nodeid];
        this._draw_node(node);
      }

      function check_nodes_ready() {
        console.log('check_node_ready' + new Date());
        var allOk = true;
        for (var nodeid in nodes) {
          node = nodes[nodeid];
          allOk = allOk & node.ready;
        }

        if (!allOk) {
          $w.setTimeout(check_nodes_ready, 200);
        } else {
          $w.setTimeout(callback, 200);
        }
      }
      check_nodes_ready();
    },

    _draw_node: function(node) {
      var ctx = this.canvas_ctx;
      var view_data = node._data.view;
      var node_element = view_data.element;
      var ncs = getComputedStyle(node_element);
      if (!is_visible(ncs)) {
        node.ready = true;
        return;
      }

      var bgcolor = css(ncs, 'background-color');
      var round_radius = parseInt(css(ncs, 'border-top-left-radius'));
      var color = css(ncs, 'color');
      var padding_left = parseInt(css(ncs, 'padding-left'));
      var padding_right = parseInt(css(ncs, 'padding-right'));
      var padding_top = parseInt(css(ncs, 'padding-top'));
      var padding_bottom = parseInt(css(ncs, 'padding-bottom'));
      var text_overflow = css(ncs, 'text-overflow');
      var font = css(ncs, 'font-style') + ' ' +
        css(ncs, 'font-variant') + ' ' +
        css(ncs, 'font-weight') + ' ' +
        css(ncs, 'font-size') + '/' + css(ncs, 'line-height') + ' ' +
        css(ncs, 'font-family');

      var rb = {
        x: view_data.abs_x,
        y: view_data.abs_y,
        w: view_data.width + 1,
        h: view_data.height + 1
      };
      var tb = {
        x: rb.x + padding_left,
        y: rb.y + padding_top,
        w: rb.w - padding_left - padding_right,
        h: rb.h - padding_top - padding_bottom
      };

      ctx.font = font;
      ctx.fillStyle = bgcolor;
      ctx.beginPath();
      jcanvas.rect(ctx, rb.x, rb.y, rb.w, rb.h, round_radius);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = color;
      if ('background-image' in node.data) {
        var backgroundUrl = css(ncs, 'background-image').slice(5, -2);
        node.ready = false;
        var rotation = 0;
        if ('background-rotation' in node.data) {
          rotation = node.data['background-rotation'];
        }
        jcanvas.image(ctx, backgroundUrl, rb.x, rb.y, rb.w, rb.h, round_radius, rotation,
          function() {
            node.ready = true;
          });
      }
      if (!!node.topic) {
        if (text_overflow === 'ellipsis') {
          jcanvas.text_ellipsis(ctx, node.topic, tb.x, tb.y, tb.w, tb.h);
        } else {
          var line_height = parseInt(css(ncs, 'line-height'));
          jcanvas.text_multiline(ctx, node.topic, tb.x, tb.y, tb.w, tb.h, line_height);
        }
      }
      if (!!view_data.expander) {
        this._draw_expander(view_data.expander);
      }
      if (!('background-image' in node.data)) {
        node.ready = true;
      }
    },

    _draw_expander: function(expander) {
      var ctx = this.canvas_ctx;
      var ncs = getComputedStyle(expander);
      if (!is_visible(ncs)) { return; }

      var style_left = css(ncs, 'left');
      var style_top = css(ncs, 'top');
      var font = css(ncs, 'font');
      var left = parseInt(style_left);
      var top = parseInt(style_top);
      var is_plus = expander.innerHTML === '+';

      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.arc(left + 7, top + 7, 5, 0, Math.PI * 2, true);
      ctx.moveTo(left + 10, top + 7);
      ctx.lineTo(left + 4, top + 7);
      if (is_plus) {
        ctx.moveTo(left + 7, top + 4);
        ctx.lineTo(left + 7, top + 10);
      }
      ctx.closePath();
      ctx.stroke();
    },

    _download: function() {
      var c = this.canvas_elem;
      var name = this.jm.mind.name + '.png';

      if (navigator.msSaveBlob && (!!c.msToBlob)) {
        var blob = c.msToBlob();
        navigator.msSaveBlob(blob, name);
      } else {
        var bloburl = this.canvas_elem.toDataURL();
        var anchor = $c('a');
        if ('download' in anchor) {
          anchor.style.visibility = 'hidden';
          anchor.href = bloburl;
          anchor.download = name;
          $d.body.appendChild(anchor);
          var evt = $d.createEvent('MouseEvents');
          evt.initEvent('click', true, true);
          anchor.dispatchEvent(evt);
          $d.body.removeChild(anchor);
        } else {
          location.href = bloburl;
        }
      }
    },

    jm_event_handle: function(type, data) {
      if (type === jsMind.event_type.resize) {
        this.resize();
      }
    }
  };

  var screenshot_plugin = new jsMind.plugin('screenshot', function(jm) {
    var jss = new jsMind.screenshot(jm);
    jm.screenshot = jss;
    jm.shoot = function() {
      jss.shoot();
    };
    jm.add_event_listener(function(type, data) {
      jss.jm_event_handle.call(jss, type, data);
    });
  });

  jsMind.register_plugin(screenshot_plugin);

})(window);



/*
 * ContextMenu - jQuery plugin for right-click context menus
 * Version: r2
 * Date: 16 July 2007
 * For documentation visit http://www.trendskitchens.co.nz/jquery/contextmenu/
 */
(function($) {

  var menu, shadow, trigger, content, hash, currentTarget;
  var defaults = {
    menuStyle: {
      listStyle: 'none',
      padding: '1px',
      margin: '0px',
      backgroundColor: '#fff',
      border: '1px solid #999',
      width: '100px'
    },
    itemStyle: {
      margin: '0px',
      color: '#000',
      display: 'block',
      cursor: 'default',
      padding: '3px',
      border: '1px solid #fff',
      backgroundColor: 'transparent'
    },
    itemHoverStyle: {
      border: '1px solid #0a246a',
      backgroundColor: '#b6bdd2'
    },
    eventPosX: 'pageX',
    eventPosY: 'pageY',
    shadow: true,
    onContextMenu: null,
    onShowMenu: null
  };

  $.fn.contextMenu = function(id, options) {
    if (!menu) { // Create singleton menu
      menu = $('<div id="jqContextMenu"></div>')
        .hide()
        .css({ position: 'absolute', zIndex: '500' })
        .appendTo('body')
        .bind('click', function(e) {
          e.stopPropagation();
        });
    }
    if (!shadow) {
      shadow = $('<div></div>')
        .css({ backgroundColor: '#000', position: 'absolute', opacity: 0.2, zIndex: 499 })
        .appendTo('body')
        .hide();
    }
    hash = hash || [];
    hash.push({
      id: id,
      menuStyle: $.extend({}, defaults.menuStyle, options.menuStyle || {}),
      itemStyle: $.extend({}, defaults.itemStyle, options.itemStyle || {}),
      itemHoverStyle: $.extend({}, defaults.itemHoverStyle, options.itemHoverStyle || {}),
      bindings: options.bindings || {},
      shadow: options.shadow || options.shadow === false ? options.shadow : defaults.shadow,
      onContextMenu: options.onContextMenu || defaults.onContextMenu,
      onShowMenu: options.onShowMenu || defaults.onShowMenu,
      eventPosX: options.eventPosX || defaults.eventPosX,
      eventPosY: options.eventPosY || defaults.eventPosY
    });

    var index = hash.length - 1;
    $(this).bind('contextmenu', function(e) {
      // Check if onContextMenu() defined
      var bShowContext = (!!hash[index].onContextMenu) ? hash[index].onContextMenu(e) : true;
      if (bShowContext) display(index, this, e, options);
      return false;
    });
    return this;
  };

  function display(index, trigger, e, options) {
    var cur = hash[index];
    content = $('#' + cur.id).find('ul:first').clone(true);
    content.css(cur.menuStyle).find('li').css(cur.itemStyle).hover(
      function() {
        $(this).css(cur.itemHoverStyle);
      },
      function() {
        $(this).css(cur.itemStyle);
      }
    ).find('img').css({ verticalAlign: 'middle', paddingRight: '2px' });

    // Send the content to the menu
    menu.html(content);

    // if there's an onShowMenu, run it now -- must run after content has been added
    // if you try to alter the content variable before the menu.html(), IE6 has issues
    // updating the content
    if (!!cur.onShowMenu) menu = cur.onShowMenu(e, menu);

    $.each(cur.bindings, function(id, func) {
      $('#' + id, menu).bind('click', function(ev) {
        hide();
        func(trigger, e.currentTarget);
      });
    });

    var left = e[cur.eventPosX];
    var top = e[cur.eventPosY];
    if (left + menu.outerWidth() > $(document.body).width()) {
      left -= menu.outerWidth();
    }

    if (top + menu.outerHeight() > $(document.body).height()) {
      top -= menu.outerHeight();
    }

    menu.css({ 'left': left, 'top': top }).show();
    //if (cur.shadow) shadow.css({ width: menu.width(), height: menu.height(), left: e.pageX + 2, top: e.pageY + 2 }).show();
    if (cur.shadow) shadow.css({ width: menu.width(), height: menu.height(), left: left + 2, top: top + 2 }).show();
    $(document).one('click', hide);
  }

  function hide() {
    menu.hide();
    shadow.hide();
  }

  // Apply defaults
  $.contextMenu = {
    defaults: function(userDefaults) {
      $.each(userDefaults, function(i, val) {
        if (typeof val == 'object' && defaults[i]) {
          $.extend(defaults[i], val);
        } else defaults[i] = val;
      });
    }
  };

})(jQuery);

// sui
(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) { var a = typeof require == "function" && require; if (!u && a) return a(o, !0); if (i) return i(o, !0); throw new Error("Cannot find module '" + o + "'") }
      var f = n[o] = { exports: {} };
      t[o][0].call(f.exports, function(e) { var n = t[o][1][e]; return s(n ? n : e) }, f, f.exports, e, t, n, r)
    }
    return n[o].exports
  }
  var i = typeof require == "function" && require;
  for (var o = 0; o < r.length; o++) s(r[o]);
  return s
})({
  1: [function(require, module, exports) {
    /**
     *  Ajax Autocomplete for jQuery, version 1.2.9
     *  (c) 2013 Tomas Kirda
     *
     *  Ajax Autocomplete for jQuery is freely distributable under the terms of an MIT-style license.
     *  For details, see the web site: https://github.com/devbridge/jQuery-Autocomplete
     *
     */

    /*jslint  browser: true, white: true, plusplus: true */
    /*global define, window, document, jQuery */

    // Expose plugin as an AMD module if AMD loader is present:
    ! function($) {
      'use strict';
      var
        utils = (function() {
          return {
            escapeRegExChars: function(value) {
              return value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            },
            createNode: function(containerClass) {
              var ul = document.createElement('ul');
              ul.className = containerClass;
              ul.style.position = 'absolute';
              ul.style.display = 'none';
              return ul;
            }
          };
        }()),

        keys = {
          ESC: 27,
          TAB: 9,
          RETURN: 13,
          LEFT: 37,
          UP: 38,
          RIGHT: 39,
          DOWN: 40
        };

      function Autocomplete(el, options) {
        var that = this;

        // Shared variables:
        that.element = el;
        that.el = $(el);
        that.suggestions = [];
        that.badQueries = [];
        that.selectedIndex = -1;
        that.currentValue = that.element.value;
        that.intervalId = 0;
        that.cachedResponse = {};
        that.onChangeInterval = null;
        that.onChange = null;
        that.isLocal = false;
        that.suggestionsContainer = null;
        that.options = that.getOptions(options);
        that.classes = {
          selected: 'active',
          suggestion: 'autocomplete-suggestion'
        };
        that.hint = null;
        that.hintValue = '';
        that.selection = null;

        // Initialize and set options:
        that.initialize();
        that.setOptions(options);
      }

      Autocomplete.utils = utils;

      $.Autocomplete = Autocomplete;

      Autocomplete.formatResult = function(suggestion, currentValue) {
        var pattern = '(' + utils.escapeRegExChars(currentValue) + ')';

        return suggestion.value.replace(new RegExp(pattern, 'gi'), '<strong>$1<\/strong>');
      };

      Autocomplete.prototype = {

        killerFn: null,

        initialize: function() {
          var that = this,
            suggestionSelector = '.' + that.classes.suggestion,
            selected = that.classes.selected,
            options = that.options,
            container;

          // Remove autocomplete attribute to prevent native suggestions:
          that.element.setAttribute('autocomplete', 'off');

          that.killerFn = function(e) {
            if ($(e.target).closest('.' + that.options.containerClass).length === 0) {
              that.killSuggestions();
              that.disableKillerFn();
            }
          };

          that.suggestionsContainer = Autocomplete.utils.createNode(options.containerClass);

          container = $(that.suggestionsContainer);

          container.appendTo(options.appendTo);

          // Only set width if it was provided:
          if (options.width !== 'auto') {
            container.width(options.width);
          }

          // Listen for mouse over event on suggestions list:
          container.on('mouseover.autocomplete', suggestionSelector, function() {
            that.activate($(this).data('index'));
          });

          // Deselect active element when mouse leaves suggestions container:
          container.on('mouseout.autocomplete', function() {
            that.selectedIndex = -1;
            container.children('.' + selected).removeClass(selected);
          });

          // Listen for click event on suggestions list:
          container.on('click.autocomplete', suggestionSelector, function() {
            that.select($(this).data('index'));
          });

          that.fixPosition();

          that.fixPositionCapture = function() {
            if (that.visible) {
              that.fixPosition();
            }
          };

          $(window).on('resize.autocomplete', that.fixPositionCapture);

          that.el.on('keydown.autocomplete', function(e) { that.onKeyPress(e); });
          that.el.on('keyup.autocomplete', function(e) { that.onKeyUp(e); });
          that.el.on('blur.autocomplete', function() { that.onBlur(); });
          that.el.on('focus.autocomplete', function() { that.onFocus(); });
          that.el.on('change.autocomplete', function(e) { that.onKeyUp(e); });
        },

        onFocus: function() {
          var that = this;
          that.fixPosition();
          if (that.options.minChars <= that.el.val().length) {
            that.onValueChange();
          }
        },

        onBlur: function() {
          this.enableKillerFn();
        },

        setOptions: function(suppliedOptions) {
          var that = this,
            options = that.options;

          $.extend(options, suppliedOptions);

          that.isLocal = $.isArray(options.lookup);

          if (that.isLocal) {
            options.lookup = that.verifySuggestionsFormat(options.lookup);
          }

          // Adjust height, width and z-index:
          $(that.suggestionsContainer).css({
            'max-height': options.maxHeight + 'px',
            'width': options.width + 'px',
            'z-index': options.zIndex
          });
        },

        clearCache: function() {
          this.cachedResponse = {};
          this.badQueries = [];
        },

        clear: function() {
          this.clearCache();
          this.currentValue = '';
          this.suggestions = [];
        },

        disable: function() {
          var that = this;
          that.disabled = true;
          if (that.currentRequest) {
            that.currentRequest.abort();
          }
        },

        enable: function() {
          this.disabled = false;
        },

        fixPosition: function() {
          var that = this,
            offset,
            styles;

          // Don't adjsut position if custom container has been specified:
          if (that.options.appendTo !== 'body') {
            return;
          }

          offset = that.el.offset();

          styles = {
            top: (offset.top + that.el.outerHeight()) + 'px',
            left: offset.left + 'px'
          };

          if (that.options.width === 'auto') {
            styles.width = (that.el.outerWidth() - 2) + 'px';
          }

          $(that.suggestionsContainer).css(styles);
        },

        enableKillerFn: function() {
          var that = this;
          $(document).on('click.autocomplete', that.killerFn);
        },

        disableKillerFn: function() {
          var that = this;
          $(document).off('click.autocomplete', that.killerFn);
        },

        killSuggestions: function() {
          var that = this;
          that.stopKillSuggestions();
          that.intervalId = window.setInterval(function() {
            that.hide();
            that.stopKillSuggestions();
          }, 50);
        },

        stopKillSuggestions: function() {
          window.clearInterval(this.intervalId);
        },

        isCursorAtEnd: function() {
          var that = this,
            valLength = that.el.val().length,
            selectionStart = that.element.selectionStart,
            range;

          if (typeof selectionStart === 'number') {
            return selectionStart === valLength;
          }
          if (document.selection) {
            range = document.selection.createRange();
            range.moveStart('character', -valLength);
            return valLength === range.text.length;
          }
          return true;
        },

        onKeyPress: function(e) {
          var that = this;

          // If suggestions are hidden and user presses arrow down, display suggestions:
          if (!that.disabled && !that.visible && e.which === keys.DOWN && that.currentValue) {
            that.suggest();
            return;
          }

          if (that.disabled || !that.visible) {
            return;
          }

          switch (e.which) {
            case keys.ESC:
              that.el.val(that.currentValue);
              that.hide();
              break;
            case keys.RIGHT:
              if (that.hint && that.options.onHint && that.isCursorAtEnd()) {
                that.selectHint();
                return;
              }
              break;
            case keys.TAB:
              if (that.hint && that.options.onHint) {
                that.selectHint();
                return;
              }
              // Fall through to RETURN
              break;
            case keys.RETURN:
              if (that.selectedIndex === -1) {
                that.hide();
                return;
              }
              that.select(that.selectedIndex);
              if (e.which === keys.TAB && that.options.tabDisabled === false) {
                return;
              }
              break;
            case keys.UP:
              that.moveUp();
              break;
            case keys.DOWN:
              that.moveDown();
              break;
            default:
              return;
          }

          // Cancel event if function did not return:
          e.stopImmediatePropagation();
          e.preventDefault();
        },

        onKeyUp: function(e) {
          var that = this;

          if (that.disabled) {
            return;
          }

          switch (e.which) {
            case keys.UP:
            case keys.DOWN:
              return;
          }

          clearInterval(that.onChangeInterval);

          if (that.currentValue !== that.el.val()) {
            that.findBestHint();
            if (that.options.deferRequestBy > 0) {
              // Defer lookup in case when value changes very quickly:
              that.onChangeInterval = setInterval(function() {
                that.onValueChange();
              }, that.options.deferRequestBy);
            } else {
              that.onValueChange();
            }
          }
        },

        onValueChange: function() {
          var that = this,
            options = that.options,
            value = that.el.val(),
            query = that.getQuery(value),
            index;

          if (that.selection) {
            that.selection = null;
            (options.onInvalidateSelection || $.noop).call(that.element);
          }

          clearInterval(that.onChangeInterval);
          that.currentValue = value;
          that.selectedIndex = -1;

          // Check existing suggestion for the match before proceeding:
          if (options.triggerSelectOnValidInput) {
            index = that.findSuggestionIndex(query);
            if (index !== -1) {
              that.select(index);
              return;
            }
          }

          if (query.length < options.minChars) {
            that.hide();
          } else {
            that.getSuggestions(query);
          }
        },

        findSuggestionIndex: function(query) {
          var that = this,
            index = -1,
            queryLowerCase = query.toLowerCase();

          $.each(that.suggestions, function(i, suggestion) {
            if (suggestion.value.toLowerCase() === queryLowerCase) {
              index = i;
              return false;
            }
          });

          return index;
        },

        getQuery: function(value) {
          var delimiter = this.options.delimiter,
            parts;

          if (!delimiter) {
            return value;
          }
          parts = value.split(delimiter);
          return $.trim(parts[parts.length - 1]);
        },

        getSuggestionsLocal: function(query) {
          var that = this,
            options = that.options,
            queryLowerCase = query.toLowerCase(),
            filter = options.lookupFilter,
            limit = parseInt(options.lookupLimit, 10),
            data;

          data = {
            suggestions: $.grep(options.lookup, function(suggestion) {
              return filter(suggestion, query, queryLowerCase);
            })
          };

          if (limit && data.suggestions.length > limit) {
            data.suggestions = data.suggestions.slice(0, limit);
          }

          return data;
        },

        getSuggestions: function(q) {
          var response,
            that = this,
            options = that.options,
            serviceUrl = options.serviceUrl,
            params,
            cacheKey;

          options.params[options.paramName] = q;
          params = options.ignoreParams ? null : options.params;

          if (that.isLocal) {
            response = that.getSuggestionsLocal(q);
          } else {
            if ($.isFunction(serviceUrl)) {
              serviceUrl = serviceUrl.call(that.element, q);
            }
            cacheKey = serviceUrl + '?' + $.param(params || {});
            response = that.cachedResponse[cacheKey];
          }

          if (response && $.isArray(response.suggestions)) {
            that.suggestions = response.suggestions;
            that.suggest();
          } else if (!that.isBadQuery(q)) {
            if (options.onSearchStart.call(that.element, options.params) === false) {
              return;
            }
            if (that.currentRequest) {
              that.currentRequest.abort();
            }
            that.currentRequest = $.ajax({
              url: serviceUrl,
              data: params,
              type: options.type,
              dataType: options.dataType
            }).done(function(data) {
              var result;
              that.currentRequest = null;
              result = options.transformResult(data);
              that.processResponse(result, q, cacheKey);
              options.onSearchComplete.call(that.element, q, result.suggestions);
            }).fail(function(jqXHR, textStatus, errorThrown) {
              options.onSearchError.call(that.element, q, jqXHR, textStatus, errorThrown);
            });
          }
        },

        isBadQuery: function(q) {
          if (!this.options.preventBadQueries) {
            return false;
          }

          var badQueries = this.badQueries,
            i = badQueries.length;

          while (i--) {
            if (q.indexOf(badQueries[i]) === 0) {
              return true;
            }
          }

          return false;
        },

        hide: function() {
          var that = this;
          that.visible = false;
          that.selectedIndex = -1;
          $(that.suggestionsContainer).hide();
          that.signalHint(null);
        },

        suggest: function() {
          if (this.suggestions.length === 0) {
            this.hide();
            return;
          }

          var that = this,
            options = that.options,
            formatResult = options.formatResult,
            value = that.getQuery(that.currentValue),
            className = that.classes.suggestion,
            classSelected = that.classes.selected,
            container = $(that.suggestionsContainer),
            beforeRender = options.beforeRender,
            html = '',
            index,
            width;

          if (options.triggerSelectOnValidInput) {
            index = that.findSuggestionIndex(value);
            if (index !== -1) {
              that.select(index);
              return;
            }
          }

          // Build suggestions inner HTML:
          $.each(that.suggestions, function(i, suggestion) {
            html += '<li class="' + className + '" data-index="' + i + '"><a>' + formatResult(suggestion, value) + '</a></li>';
          });

          // If width is auto, adjust width before displaying suggestions,
          // because if instance was created before input had width, it will be zero.
          // Also it adjusts if input width has changed.
          // -2px to account for suggestions border.
          if (options.width === 'auto') {
            width = that.el.outerWidth() - 2;
            container.width(width > 0 ? width : 300);
          }

          container.html(html);

          // Select first value by default:
          if (options.autoSelectFirst) {
            that.selectedIndex = 0;
            container.children().first().addClass(classSelected);
          }

          if ($.isFunction(beforeRender)) {
            beforeRender.call(that.element, container);
          }

          container.show();
          that.visible = true;

          that.findBestHint();
        },

        findBestHint: function() {
          var that = this,
            value = that.el.val().toLowerCase(),
            bestMatch = null;

          if (!value) {
            return;
          }

          $.each(that.suggestions, function(i, suggestion) {
            var foundMatch = suggestion.value.toLowerCase().indexOf(value) === 0;
            if (foundMatch) {
              bestMatch = suggestion;
            }
            return !foundMatch;
          });

          that.signalHint(bestMatch);
        },

        signalHint: function(suggestion) {
          var hintValue = '',
            that = this;
          if (suggestion) {
            hintValue = that.currentValue + suggestion.value.substr(that.currentValue.length);
          }
          if (that.hintValue !== hintValue) {
            that.hintValue = hintValue;
            that.hint = suggestion;
            (this.options.onHint || $.noop)(hintValue);
          }
        },

        verifySuggestionsFormat: function(suggestions) {
          // If suggestions is string array, convert them to supported format:
          if (suggestions.length && typeof suggestions[0] === 'string') {
            return $.map(suggestions, function(value) {
              return { value: value, data: null };
            });
          }

          return suggestions;
        },

        processResponse: function(result, originalQuery, cacheKey) {
          var that = this,
            options = that.options;

          result.suggestions = that.verifySuggestionsFormat(result.suggestions);

          // Cache results if cache is not disabled:
          if (!options.noCache) {
            that.cachedResponse[cacheKey] = result;
            if (options.preventBadQueries && result.suggestions.length === 0) {
              that.badQueries.push(originalQuery);
            }
          }

          // Return if originalQuery is not matching current query:
          if (originalQuery !== that.getQuery(that.currentValue)) {
            return;
          }

          that.suggestions = result.suggestions;
          that.suggest();
        },

        activate: function(index) {
          var that = this,
            activeItem,
            selected = that.classes.selected,
            container = $(that.suggestionsContainer),
            children = container.children();

          container.children('.' + selected).removeClass(selected);

          that.selectedIndex = index;

          if (that.selectedIndex !== -1 && children.length > that.selectedIndex) {
            activeItem = children.get(that.selectedIndex);
            $(activeItem).addClass(selected);
            return activeItem;
          }

          return null;
        },

        selectHint: function() {
          var that = this,
            i = $.inArray(that.hint, that.suggestions);

          that.select(i);
        },

        select: function(i) {
          var that = this;
          that.hide();
          that.onSelect(i);
        },

        moveUp: function() {
          var that = this;

          if (that.selectedIndex === -1) {
            return;
          }

          if (that.selectedIndex === 0) {
            $(that.suggestionsContainer).children().first().removeClass(that.classes.selected);
            that.selectedIndex = -1;
            that.el.val(that.currentValue);
            that.findBestHint();
            return;
          }

          that.adjustScroll(that.selectedIndex - 1);
        },

        moveDown: function() {
          var that = this;

          if (that.selectedIndex === (that.suggestions.length - 1)) {
            return;
          }

          that.adjustScroll(that.selectedIndex + 1);
        },

        adjustScroll: function(index) {
          var that = this,
            activeItem = that.activate(index),
            offsetTop,
            upperBound,
            lowerBound,
            heightDelta = 25;

          if (!activeItem) {
            return;
          }

          offsetTop = activeItem.offsetTop;
          upperBound = $(that.suggestionsContainer).scrollTop();
          lowerBound = upperBound + that.options.maxHeight - heightDelta;

          if (offsetTop < upperBound) {
            $(that.suggestionsContainer).scrollTop(offsetTop);
          } else if (offsetTop > lowerBound) {
            $(that.suggestionsContainer).scrollTop(offsetTop - that.options.maxHeight + heightDelta);
          }

          that.el.val(that.getValue(that.suggestions[index].value));
          that.signalHint(null);
        },

        onSelect: function(index) {
          var that = this,
            onSelectCallback = that.options.onSelect,
            suggestion = that.suggestions[index];

          that.currentValue = that.getValue(suggestion.value);

          if (that.currentValue !== that.el.val()) {
            that.el.val(that.currentValue);
          }

          that.signalHint(null);
          that.suggestions = [];
          that.selection = suggestion;

          if ($.isFunction(onSelectCallback)) {
            onSelectCallback.call(that.element, suggestion);
          }
        },

        getValue: function(value) {
          var that = this,
            delimiter = that.options.delimiter,
            currentValue,
            parts;

          if (!delimiter) {
            return value;
          }

          currentValue = that.currentValue;
          parts = currentValue.split(delimiter);

          if (parts.length === 1) {
            return value;
          }

          return currentValue.substr(0, currentValue.length - parts[parts.length - 1].length) + value;
        },

        dispose: function() {
          var that = this;
          that.el.off('.autocomplete').removeData('autocomplete');
          that.disableKillerFn();
          $(window).off('resize.autocomplete', that.fixPositionCapture);
          $(that.suggestionsContainer).remove();
        },
        getOptions: function(options) {
          return options = $.extend({}, $.fn.autocomplete.defaults, this.el.data(), options);
        }
      };



      // Create chainable jQuery plugin:
      $.fn.autocomplete = function(option, args) {
        var dataKey = 'autocomplete';
        return this.each(function() {
          var $this = $(this),
            data = $this.data(dataKey),
            options = typeof option == 'object' && option
          if (!data) $this.data(dataKey, (data = new Autocomplete(this, options)))
          if (typeof option == 'string') data[option]()
        });
      };

      $.fn.autocomplete.defaults = {
        autoSelectFirst: false,
        appendTo: 'body',
        serviceUrl: null,
        lookup: null,
        onSelect: null,
        width: 'auto',
        minChars: 1,
        maxHeight: 300,
        deferRequestBy: 0,
        params: {},
        formatResult: Autocomplete.formatResult,
        delimiter: null,
        zIndex: 9999,
        type: 'GET',
        noCache: false,
        onSearchStart: $.noop,
        onSearchComplete: $.noop,
        onSearchError: $.noop,
        containerClass: 'sui-dropdown-menu sui-suggestion-container',
        tabDisabled: false,
        dataType: 'text',
        currentRequest: null,
        triggerSelectOnValidInput: true,
        preventBadQueries: true,
        lookupFilter: function(suggestion, originalQuery, queryLowerCase) {
          return suggestion.value.toLowerCase().indexOf(queryLowerCase) !== -1;
        },
        paramName: 'query',
        transformResult: function(response) {
          return typeof response === 'string' ? $.parseJSON(response) : response;
        }
      };

      $(function() {
        $("[data-toggle='autocomplete']").autocomplete();
      });
    }(window.jQuery);

  }, {}],
  2: [function(require, module, exports) {
    /* ============================================================
     * bootstrap-button.js v2.3.2
     * http://getbootstrap.com/2.3.2/javascript.html#buttons
     * ============================================================
     * Copyright 2013 Twitter, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * ============================================================ */


    ! function($) {

      "use strict";


      /* BUTTON PUBLIC CLASS DEFINITION
       * ============================== */

      var Button = function(element, options) {
        this.$element = $(element)
        this.options = $.extend({}, $.fn.button.defaults, options)
      }

      Button.prototype.setState = function(state) {
        var d = 'disabled',
          $el = this.$element,
          data = $el.data(),
          val = $el.is('input') ? 'val' : 'html'

        state = state + 'Text'
        data.resetText || $el.data('resetText', $el[val]())

        $el[val](data[state] || this.options[state])

        // push to event loop to allow forms to submit
        setTimeout(function() {
          state == 'loadingText' ?
            $el.addClass(d).attr(d, d) :
            $el.removeClass(d).removeAttr(d)
        }, 0)
      }

      Button.prototype.toggle = function() {
        var $parent = this.$element.closest('[data-toggle="buttons-radio"]')

        $parent && $parent
          .find('.active')
          .removeClass('active')

        this.$element.toggleClass('active')
      }


      /* BUTTON PLUGIN DEFINITION
       * ======================== */

      var old = $.fn.button

      $.fn.button = function(option) {
        return this.each(function() {
          var $this = $(this),
            data = $this.data('button'),
            options = typeof option == 'object' && option
          if (!data) $this.data('button', (data = new Button(this, options)))
          if (option == 'toggle') data.toggle()
          else if (option) data.setState(option)
        })
      }

      $.fn.button.defaults = {
        loadingText: 'loading...'
      }

      $.fn.button.Constructor = Button


      /* BUTTON NO CONFLICT
       * ================== */

      $.fn.button.noConflict = function() {
        $.fn.button = old
        return this
      }


      /* BUTTON DATA-API
       * =============== */

      $(document).on('click.button.data-api', '[data-toggle^=button]', function(e) {
        var $btn = $(e.target)
        if (!$btn.hasClass('btn')) $btn = $btn.closest('.btn')
        $btn.button('toggle')
      })

    }(window.jQuery);

  }, {}],
  3: [function(require, module, exports) {
    /* ==========================================================
     * bootstrap-carousel.js v2.3.2
     * http://getbootstrap.com/2.3.2/javascript.html#carousel
     * ==========================================================
     * Copyright 2013 Twitter, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * ========================================================== */


    ! function($) {

      "use strict";


      /* CAROUSEL CLASS DEFINITION
       * ========================= */

      var Carousel = function(element, options) {
        this.$element = $(element)
        this.$indicators = this.$element.find('.carousel-indicators')
        this.options = options
        this.options.pause == 'hover' && this.$element
          .on('mouseenter', $.proxy(this.pause, this))
          .on('mouseleave', $.proxy(this.cycle, this))
      }

      Carousel.prototype = {

        cycle: function(e) {
            if (!e) this.paused = false
            if (this.interval) clearInterval(this.interval);
            this.options.interval &&
              !this.paused &&
              (this.interval = setInterval($.proxy(this.next, this), this.options.interval))
            return this
          }

          ,
        getActiveIndex: function() {
            this.$active = this.$element.find('.item.active')
            this.$items = this.$active.parent().children()
            return this.$items.index(this.$active)
          }

          ,
        to: function(pos) {
            var activeIndex = this.getActiveIndex(),
              that = this

            if (pos > (this.$items.length - 1) || pos < 0) return

            if (this.sliding) {
              return this.$element.one('slid', function() {
                that.to(pos)
              })
            }

            if (activeIndex == pos) {
              return this.pause().cycle()
            }

            return this.slide(pos > activeIndex ? 'next' : 'prev', $(this.$items[pos]))
          }

          ,
        pause: function(e) {
            if (!e) this.paused = true
            if (this.$element.find('.next, .prev').length && $.support.transition.end) {
              this.$element.trigger($.support.transition.end)
              this.cycle(true)
            }
            clearInterval(this.interval)
            this.interval = null
            return this
          }

          ,
        next: function() {
            if (this.sliding) return
            return this.slide('next')
          }

          ,
        prev: function() {
            if (this.sliding) return
            return this.slide('prev')
          }

          ,
        slide: function(type, next) {
          var $active = this.$element.find('.item.active'),
            $next = next || $active[type](),
            isCycling = this.interval,
            direction = type == 'next' ? 'left' : 'right',
            fallback = type == 'next' ? 'first' : 'last',
            that = this,
            e

          this.sliding = true

          isCycling && this.pause()

          $next = $next.length ? $next : this.$element.find('.item')[fallback]()

          e = $.Event('slide', {
            relatedTarget: $next[0],
            direction: direction
          })

          if ($next.hasClass('active')) return

          if (this.$indicators.length) {
            this.$indicators.find('.active').removeClass('active')
            this.$element.one('slid', function() {
              var $nextIndicator = $(that.$indicators.children()[that.getActiveIndex()])
              $nextIndicator && $nextIndicator.addClass('active')
            })
          }

          if ($.support.transition && this.$element.hasClass('slide')) {
            this.$element.trigger(e)
            if (e.isDefaultPrevented()) return
            $next.addClass(type)
            $next[0].offsetWidth // force reflow
            $active.addClass(direction)
            $next.addClass(direction)
            this.$element.one($.support.transition.end, function() {
              $next.removeClass([type, direction].join(' ')).addClass('active')
              $active.removeClass(['active', direction].join(' '))
              that.sliding = false
              setTimeout(function() { that.$element.trigger('slid') }, 0)
            })
          } else {
            this.$element.trigger(e)
            if (e.isDefaultPrevented()) return
            $active.removeClass('active')
            $next.addClass('active')
            this.sliding = false
            this.$element.trigger('slid')
          }

          isCycling && this.cycle()

          return this
        }

      }


      /* CAROUSEL PLUGIN DEFINITION
       * ========================== */

      var old = $.fn.carousel

      $.fn.carousel = function(option) {
        return this.each(function() {
          var $this = $(this),
            data = $this.data('carousel'),
            options = $.extend({}, $.fn.carousel.defaults, $this.data(), typeof option == 'object' && option),
            action = typeof option == 'string' ? option : options.slide
          if (!data) $this.data('carousel', (data = new Carousel(this, options)))
          if (typeof option == 'number') data.to(option)
          else if (action) data[action]()
          else if (options.autoStart) data.pause().cycle()
        })
      }

      $.fn.carousel.defaults = {
        interval: 5000,
        pause: 'hover',
        autoStart: true
      }

      $.fn.carousel.Constructor = Carousel


      /* CAROUSEL NO CONFLICT
       * ==================== */

      $.fn.carousel.noConflict = function() {
        $.fn.carousel = old
        return this
      }

      /* CAROUSEL DATA-API
       * ================= */

      $(document).on('click.sui-carousel.data-api', '[data-slide], [data-slide-to]', function(e) {
        var $this = $(this),
          href, $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
          ,
          options = $.extend({}, $target.data(), $this.data()),
          slideIndex

        $target.carousel(options)

        if (slideIndex = $this.attr('data-slide-to')) {
          $target.data('carousel').pause().to(slideIndex).cycle()
        }

        e.preventDefault()
      })

      $(function() {
        $("[data-ride='carousel']").carousel();
      });

    }(window.jQuery);

  }, {}],
  4: [function(require, module, exports) {
    ! function($) {

      "use strict";

      var CHECKED_CLASS = 'checked';
      var HALF_CHECKED_CLASS = 'halfchecked';
      var DISABLED_CLASS = 'disabled';

      var Checkbox = function(element, options) {
        this.$element = $(element)
        //this.options = $.extend({}, $.fn.checkbox.defaults, options)
        this.$checkbox = this.$element.find("input")
      }

      var old = $.fn.checkbox

      $.fn.checkbox = function(option) {
        return this.each(function() {
          var $this = $(this),
            data = $this.data('checkbox'),
            options = typeof option == 'object' && option
          if (!data) $this.data('checkbox', (data = new Checkbox(this, options)))
          else if (option) data[option]()
        })
      }

      Checkbox.prototype.toggle = function() {
        if (this.$checkbox.prop("checked")) this.uncheck()
        else this.check()
        this.$checkbox.trigger("change")
      }

      Checkbox.prototype.check = function() {
        if (this.$checkbox.prop("disabled")) return
        this.$checkbox.prop('checked', true)
        this.$checkbox.trigger("change")
      }
      Checkbox.prototype.uncheck = function() {
        if (this.$checkbox.prop("disabled")) return
        this.$checkbox.prop('checked', false)
        this.$checkbox.trigger("change")
      }
      Checkbox.prototype.halfcheck = function() {
        if (this.$checkbox.prop("disabled")) return
        this.$checkbox.prop('checked', false)
        this.$element.removeClass(CHECKED_CLASS).addClass("halfchecked")
      }

      Checkbox.prototype.disable = function() {
        this.$checkbox.prop('disabled', true)
        this.$checkbox.trigger("change")
      }
      Checkbox.prototype.enable = function() {
        this.$checkbox.prop('disabled', false)
        this.$checkbox.trigger("change")
      }

      $.fn.checkbox.defaults = {
        loadingText: 'loading...'
      }

      $.fn.checkbox.Constructor = Checkbox


      /* NO CONFLICT
       * ================== */

      $.fn.checkbox.noConflict = function() {
        $.fn.checkbox = old
        return this
      }

      $.fn.radio = $.fn.checkbox;


      // update status on document;
      $(document).on("change", "input[type='checkbox'], input[type='radio']", function(e) {
        var $checkbox = $(e.currentTarget);
        var $container = $checkbox.parent();
        var update = function($checkbox) {
          var $container = $checkbox.parent();
          if ($checkbox.prop("checked")) $container.removeClass(HALF_CHECKED_CLASS).addClass(CHECKED_CLASS)
          else $container.removeClass(CHECKED_CLASS).removeClass(HALF_CHECKED_CLASS)
          if ($checkbox.prop('disabled')) $container.addClass(DISABLED_CLASS)
          else $container.removeClass(DISABLED_CLASS)
        }
        if ($container.hasClass("checkbox-pretty") || $container.hasClass("radio-pretty")) {
          update($checkbox);
        }
        if ($checkbox.attr('type').toLowerCase() === 'radio') {
          var name = $checkbox.attr("name");
          $("input[name='" + name + "']").each(function() {
            update($(this));
          });
        }
      });
    }(window.jQuery);

  }, {}],
  5: [function(require, module, exports) {
    /*jshint sub:true*/
    /*
     * js come from :bootstrap-datepicker.js
     * Started by Stefan Petre; improvements by Andrew Rowls + contributors
     * you con get the source from github: https://github.com/eternicode/bootstrap-datepicker
     */
    ! function($, undefined) {

      var $window = $(window);

      function UTCDate() {
        return new Date(Date.UTC.apply(Date, arguments));
      }

      function UTCToday() {
        var today = new Date();
        return UTCDate(today.getFullYear(), today.getMonth(), today.getDate());
      }

      function alias(method) {
        return function() {
          return this[method].apply(this, arguments);
        };
      }

      var DateArray = (function() {
        var extras = {
          get: function(i) {
            return this.slice(i)[0];
          },
          contains: function(d) {
            // Array.indexOf is not cross-browser;
            // $.inArray doesn't work with Dates
            var val = d && d.valueOf();
            for (var i = 0, l = this.length; i < l; i++)
              if (this[i].valueOf() === val)
                return i;
            return -1;
          },
          remove: function(i) {
            this.splice(i, 1);
          },
          replace: function(new_array) {
            if (!new_array)
              return;
            if (!$.isArray(new_array))
              new_array = [new_array];
            this.clear();
            this.push.apply(this, new_array);
          },
          clear: function() {
            this.length = 0;
          },
          copy: function() {
            var a = new DateArray();
            a.replace(this);
            return a;
          }
        };

        return function() {
          var a = [];
          a.push.apply(a, arguments);
          $.extend(a, extras);
          return a;
        };
      })();


      // Picker object

      var Datepicker = function(element, options) {
        this.dates = new DateArray();
        this.viewDate = UTCToday();
        this.focusDate = null;

        this._process_options(options);

        this.element = $(element);
        this.isInline = false;
        this.isInput = this.element.is('input');
        this.component = this.element.is('.date') ? this.element.find('.add-on, .input-group-addon, .sui-btn') : false;
        this.hasInput = this.component && this.element.find('input').length;
        if (this.component && this.component.length === 0)
          this.component = false;

        this.picker = $(DPGlobal.template);

        if (this.o.timepicker) {
          this.timepickerContainer = this.picker.find('.timepicker-container');
          this.timepickerContainer.timepicker();
          this.timepicker = this.timepickerContainer.data('timepicker');
          this.timepicker._render();
          //this.setTimeValue();
        }

        this._buildEvents();
        this._attachEvents();

        if (this.isInline) {
          this.picker.addClass('datepicker-inline').appendTo(this.element);
        } else {
          this.picker.addClass('datepicker-dropdown dropdown-menu');
        }

        if (this.o.rtl) {
          this.picker.addClass('datepicker-rtl');
        }

        if (this.o.size === 'small') {
          this.picker.addClass('datepicker-small');
        }

        this.viewMode = this.o.startView;

        if (this.o.calendarWeeks)
          this.picker.find('tfoot th.today')
          .attr('colspan', function(i, val) {
            return parseInt(val) + 1;
          });

        this._allow_update = false;

        this.setStartDate(this._o.startDate);
        this.setEndDate(this._o.endDate);
        this.setDaysOfWeekDisabled(this.o.daysOfWeekDisabled);

        this.fillDow();
        this.fillMonths();

        this._allow_update = true;

        this.update();
        this.showMode();

        if (this.isInline) {
          this.show();
        }
      };

      Datepicker.prototype = {
        constructor: Datepicker,

        _process_options: function(opts) {
          // Store raw options for reference
          this._o = $.extend({}, this._o, opts);
          // Processed options
          var o = this.o = $.extend({}, this._o);

          // Check if "de-DE" style date is available, if not language should
          // fallback to 2 letter code eg "de"
          var lang = o.language;
          if (!dates[lang]) {
            lang = lang.split('-')[0];
            if (!dates[lang])
              lang = defaults.language;
          }
          o.language = lang;

          switch (o.startView) {
            case 2:
            case 'decade':
              o.startView = 2;
              break;
            case 1:
            case 'year':
              o.startView = 1;
              break;
            default:
              o.startView = 0;
          }

          switch (o.minViewMode) {
            case 1:
            case 'months':
              o.minViewMode = 1;
              break;
            case 2:
            case 'years':
              o.minViewMode = 2;
              break;
            default:
              o.minViewMode = 0;
          }

          o.startView = Math.max(o.startView, o.minViewMode);

          // true, false, or Number > 0
          if (o.multidate !== true) {
            o.multidate = Number(o.multidate) || false;
            if (o.multidate !== false)
              o.multidate = Math.max(0, o.multidate);
            else
              o.multidate = 1;
          }
          o.multidateSeparator = String(o.multidateSeparator);

          o.weekStart %= 7;
          o.weekEnd = ((o.weekStart + 6) % 7);

          var format = DPGlobal.parseFormat(o.format);
          if (o.startDate !== -Infinity) {
            if (!!o.startDate) {
              if (o.startDate instanceof Date)
                o.startDate = this._local_to_utc(this._zero_time(o.startDate));
              else
                o.startDate = DPGlobal.parseDate(o.startDate, format, o.language);
            } else {
              o.startDate = -Infinity;
            }
          }
          if (o.endDate !== Infinity) {
            if (!!o.endDate) {
              if (o.endDate instanceof Date)
                o.endDate = this._local_to_utc(this._zero_time(o.endDate));
              else
                o.endDate = DPGlobal.parseDate(o.endDate, format, o.language);
            } else {
              o.endDate = Infinity;
            }
          }

          o.daysOfWeekDisabled = o.daysOfWeekDisabled || [];
          if (!$.isArray(o.daysOfWeekDisabled))
            o.daysOfWeekDisabled = o.daysOfWeekDisabled.split(/[,\s]*/);
          o.daysOfWeekDisabled = $.map(o.daysOfWeekDisabled, function(d) {
            return parseInt(d, 10);
          });

          var plc = String(o.orientation).toLowerCase().split(/\s+/g),
            _plc = o.orientation.toLowerCase();
          plc = $.grep(plc, function(word) {
            return (/^auto|left|right|top|bottom$/).test(word);
          });
          o.orientation = {
            x: 'auto',
            y: 'auto'
          };
          if (!_plc || _plc === 'auto')
          ; // no action
          else if (plc.length === 1) {
            switch (plc[0]) {
              case 'top':
              case 'bottom':
                o.orientation.y = plc[0];
                break;
              case 'left':
              case 'right':
                o.orientation.x = plc[0];
                break;
            }
          } else {
            _plc = $.grep(plc, function(word) {
              return (/^left|right$/).test(word);
            });
            o.orientation.x = _plc[0] || 'auto';

            _plc = $.grep(plc, function(word) {
              return (/^top|bottom$/).test(word);
            });
            o.orientation.y = _plc[0] || 'auto';
          }
        },
        _events: [],
        _secondaryEvents: [],
        _applyEvents: function(evs) {
          for (var i = 0, el, ch, ev; i < evs.length; i++) {
            el = evs[i][0];
            if (evs[i].length === 2) {
              ch = undefined;
              ev = evs[i][1];
            } else if (evs[i].length === 3) {
              ch = evs[i][1];
              ev = evs[i][2];
            }
            el.on(ev, ch);
          }
        },
        _unapplyEvents: function(evs) {
          for (var i = 0, el, ev, ch; i < evs.length; i++) {
            el = evs[i][0];
            if (evs[i].length === 2) {
              ch = undefined;
              ev = evs[i][1];
            } else if (evs[i].length === 3) {
              ch = evs[i][1];
              ev = evs[i][2];
            }
            el.off(ev, ch);
          }
        },
        _buildEvents: function() {
          if (this.isInput) { // single input
            this._events = [
              [this.element, {
                focus: $.proxy(this.show, this),
                keyup: $.proxy(function(e) {
                  if ($.inArray(e.keyCode, [27, 37, 39, 38, 40, 32, 13, 9]) === -1)
                    this.update();
                }, this),
                keydown: $.proxy(this.keydown, this)
              }]
            ];
          } else if (this.component && this.hasInput) { // component: input + button
            this._events = [
              // For components that are not readonly, allow keyboard nav
              [this.element.find('input'), {
                focus: $.proxy(this.show, this),
                keyup: $.proxy(function(e) {
                  if ($.inArray(e.keyCode, [27, 37, 39, 38, 40, 32, 13, 9]) === -1)
                    this.update();
                }, this),
                keydown: $.proxy(this.keydown, this)
              }],
              [this.component, {
                click: $.proxy(this.show, this)
              }]
            ];
          } else if (this.element.is('div')) { // inline datepicker
            this.isInline = true;
          } else {
            this._events = [
              [this.element, {
                click: $.proxy(this.show, this)
              }]
            ];
          }
          //timepicker change
          if (this.o.timepicker) {
            this._events.push(
              [this.timepickerContainer, {
                'time:change': $.proxy(this.timeChange, this)
              }]
            )
          }

          this._events.push(
            // Component: listen for blur on element descendants
            [this.element, '*', {
              blur: $.proxy(function(e) {
                this._focused_from = e.target;
              }, this)
            }],
            // Input: listen for blur on element
            [this.element, {
              blur: $.proxy(function(e) {
                this._focused_from = e.target;
              }, this)
            }]
          );

          this._secondaryEvents = [
            [this.picker, {
              click: $.proxy(this.click, this)
            }],
            [$(window), {
              resize: $.proxy(this.place, this)
            }],
            [$(document), {
              'mousedown touchstart': $.proxy(function(e) {
                // Clicked outside the datepicker, hide it
                if (!(
                    this.element.is(e.target) ||
                    this.element.find(e.target).length ||
                    this.picker.is(e.target) ||
                    this.picker.find(e.target).length
                  )) {
                  this.hide();
                }
              }, this)
            }]
          ];
        },
        _attachEvents: function() {
          this._detachEvents();
          this._applyEvents(this._events);
        },
        _detachEvents: function() {
          this._unapplyEvents(this._events);
        },
        _attachSecondaryEvents: function() {
          this._detachSecondaryEvents();
          this._applyEvents(this._secondaryEvents);
          if (this.o.timepicker) {
            this.timepicker._attachSecondaryEvents();
          }
        },
        _detachSecondaryEvents: function() {
          this._unapplyEvents(this._secondaryEvents);
          if (this.o.timepicker) {
            this.timepicker._detachSecondaryEvents();
          }
        },
        _trigger: function(event, altdate) {
          var date = altdate || this.dates.get(-1),
            local_date = this._utc_to_local(date);

          this.element.trigger({
            type: event,
            date: local_date,
            dates: $.map(this.dates, this._utc_to_local),
            format: $.proxy(function(ix, format) {
              if (arguments.length === 0) {
                ix = this.dates.length - 1;
                format = this.o.format;
              } else if (typeof ix === 'string') {
                format = ix;
                ix = this.dates.length - 1;
              }
              format = format || this.o.format;
              var date = this.dates.get(ix);
              return DPGlobal.formatDate(date, format, this.o.language);
            }, this)
          });
        },
        timeChange: function(e) {
          this.setValue();
        },
        show: function(e) {
          if (e && e.type === "focus" && this.picker.is(":visible")) return;
          if (!this.isInline)
            this.picker.appendTo('body');
          this.picker.show();
          this.place();
          this._attachSecondaryEvents();
          if (this.o.timepicker) {
            this.timepicker._show();
          }
          this._trigger('show');
        },

        hide: function() {
          if (this.isInline)
            return;
          if (!this.picker.is(':visible'))
            return;
          this.focusDate = null;
          this.picker.hide().detach();
          this._detachSecondaryEvents();
          this.viewMode = this.o.startView;
          this.showMode();

          if (
            this.o.forceParse &&
            (
              this.isInput && this.element.val() ||
              this.hasInput && this.element.find('input').val()
            )
          )
            this.setValue();
          if (this.o.timepicker) {
            this.timepicker._hide();
          }
          this._trigger('hide');
        },

        remove: function() {
          this.hide();
          this._detachEvents();
          this._detachSecondaryEvents();
          this.picker.remove();
          delete this.element.data().datepicker;
          if (!this.isInput) {
            delete this.element.data().date;
          }
        },

        _utc_to_local: function(utc) {
          return utc && new Date(utc.getTime() + (utc.getTimezoneOffset() * 60000));
        },
        _local_to_utc: function(local) {
          return local && new Date(local.getTime() - (local.getTimezoneOffset() * 60000));
        },
        _zero_time: function(local) {
          return local && new Date(local.getFullYear(), local.getMonth(), local.getDate());
        },
        _zero_utc_time: function(utc) {
          return utc && new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
        },

        getDates: function() {
          return $.map(this.dates, this._utc_to_local);
        },

        getUTCDates: function() {
          return $.map(this.dates, function(d) {
            return new Date(d);
          });
        },

        getDate: function() {
          return this._utc_to_local(this.getUTCDate());
        },

        getUTCDate: function() {
          return new Date(this.dates.get(-1));
        },

        setDates: function() {
          var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
          this.update.apply(this, args);
          this._trigger('changeDate');
          this.setValue();
        },

        setUTCDates: function() {
          var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
          this.update.apply(this, $.map(args, this._utc_to_local));
          this._trigger('changeDate');
          this.setValue();
        },

        setDate: alias('setDates'),
        setUTCDate: alias('setUTCDates'),

        setValue: function() {
          var formatted = this.getFormattedDate();
          if (!this.isInput) {
            if (this.component) {
              this.element.find('input').val(formatted).change();
            }
          } else {
            this.element.val(formatted).change();
          }
        },

        setTimeValue: function() {
          var val, minute, hour, time;
          time = {
            hour: (new Date()).getHours(),
            minute: (new Date()).getMinutes()
          };
          if (this.isInput) {
            element = this.element;
          } else if (this.component) {
            element = this.element.find('input');
          }
          if (element) {

            val = $.trim(element.val());
            if (val) {
              var tokens = val.split(" "); //datetime
              if (tokens.length === 2) {
                val = tokens[1];
              }
            }
            val = val.split(':');
            for (var i = val.length - 1; i >= 0; i--) {
              val[i] = $.trim(val[i]);
            }
            if (val.length === 2) {
              minute = parseInt(val[1], 10);
              if (minute >= 0 && minute < 60) {
                time.minute = minute;
              }
              hour = parseInt(val[0].slice(-2), 10);
              if (hour >= 0 && hour < 24) {
                time.hour = hour;
              }
            }
          }
          this.timepickerContainer.data("time", time.hour + ":" + time.minute);
        },

        getFormattedDate: function(format) {
          if (format === undefined)
            format = this.o.format;

          var lang = this.o.language;
          var text = $.map(this.dates, function(d) {
            return DPGlobal.formatDate(d, format, lang);
          }).join(this.o.multidateSeparator);
          if (this.o.timepicker) {
            if (!text) {
              text = DPGlobal.formatDate(new Date(), format, lang);
            }
            text = text + " " + this.timepickerContainer.data('time');
          }
          return text;
        },

        setStartDate: function(startDate) {
          this._process_options({
            startDate: startDate
          });
          this.update();
          this.updateNavArrows();
        },

        setEndDate: function(endDate) {
          this._process_options({
            endDate: endDate
          });
          this.update();
          this.updateNavArrows();
        },

        setDaysOfWeekDisabled: function(daysOfWeekDisabled) {
          this._process_options({
            daysOfWeekDisabled: daysOfWeekDisabled
          });
          this.update();
          this.updateNavArrows();
        },

        place: function() {
          if (this.isInline)
            return;
          var calendarWidth = this.picker.outerWidth(),
            calendarHeight = this.picker.outerHeight(),
            visualPadding = 10,
            windowWidth = $window.width(),
            windowHeight = $window.height(),
            scrollTop = $window.scrollTop();

          var zIndex = parseInt(this.element.parents().filter(function() {
            return $(this).css('z-index') !== 'auto';
          }).first().css('z-index')) + 10;
          var offset = this.component ? this.component.parent().offset() : this.element.offset();
          var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
          var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
          var left = offset.left,
            top = offset.top;

          this.picker.removeClass(
            'datepicker-orient-top datepicker-orient-bottom ' +
            'datepicker-orient-right datepicker-orient-left'
          );

          if (this.o.orientation.x !== 'auto') {
            this.picker.addClass('datepicker-orient-' + this.o.orientation.x);
            if (this.o.orientation.x === 'right')
              left -= calendarWidth - width;
          }
          // auto x orientation is best-placement: if it crosses a window
          // edge, fudge it sideways
          else {
            // Default to left
            this.picker.addClass('datepicker-orient-left');
            if (offset.left < 0)
              left -= offset.left - visualPadding;
            else if (offset.left + calendarWidth > windowWidth)
              left = windowWidth - calendarWidth - visualPadding;
          }

          // auto y orientation is best-situation: top or bottom, no fudging,
          // decision based on which shows more of the calendar
          var yorient = this.o.orientation.y,
            top_overflow, bottom_overflow;
          if (yorient === 'auto') {
            top_overflow = -scrollTop + offset.top - calendarHeight;
            bottom_overflow = scrollTop + windowHeight - (offset.top + height + calendarHeight);
            if (Math.max(top_overflow, bottom_overflow) === bottom_overflow)
              yorient = 'top';
            else
              yorient = 'bottom';
          }
          this.picker.addClass('datepicker-orient-' + yorient);
          if (yorient === 'top')
            top += height + 6;
          else
            top -= calendarHeight + parseInt(this.picker.css('padding-top')) + 6;

          this.picker.css({
            top: top,
            left: left,
            zIndex: zIndex
          });
        },
        _getTime: function(date) {
          var h, m;
          date = new Date(date);
          h = date.getHours();
          if (h < 10) {
            h = "0" + h;
          }
          m = date.getMinutes();
          if (m < 10) {
            m = "0" + m;
          }
          return h + ":" + m;
        },
        _allow_update: true,
        update: function() {
          if (!this._allow_update)
            return;

          var oldDates = this.dates.copy(),
            dates = [],
            fromArgs = false;
          if (arguments.length) {
            $.each(arguments, $.proxy(function(i, date) {
              //鑾峰彇绗竴涓殑鏃堕棿,鐢ㄦ潵update 鏃堕棿
              if (this.o.timepicker && i === 0) {

                this.timepicker.update(this._getTime(date)); //涓嶈鏇存柊input
              }
              if (date instanceof Date)
                date = this._local_to_utc(date);
              else if (typeof date == "string" && this.o.timepicker) {
                date = date.split(" ")[0];
              }
              dates.push(date);
            }, this));
            fromArgs = true;



          } else {
            dates = this.isInput ? this.element.val() : this.element.data('date') || this.element.find('input').val();
            if (dates && this.o.timepicker) { //鍚堜綋妯″紡
              var tokens = dates.split(" ");
              if (tokens.length === 2) { //鏈夋椂闂�
                dates = tokens[0];
                //璋冪敤timepicker 鐨刜updateUI
                this.timepicker.update(tokens[1], true); //涓嶈鏇存柊input
              }
            }
            if (dates && this.o.multidate)
              dates = dates.split(this.o.multidateSeparator);
            else
              dates = [dates];
            delete this.element.data().date;
          }

          dates = $.map(dates, $.proxy(function(date) {
            return DPGlobal.parseDate(date, this.o.format, this.o.language);
          }, this));
          dates = $.grep(dates, $.proxy(function(date) {
            return (
              date < this.o.startDate ||
              date > this.o.endDate ||
              !date
            );
          }, this), true);
          this.dates.replace(dates);

          if (this.dates.length)
            this.viewDate = new Date(this.dates.get(-1));
          else if (this.viewDate < this.o.startDate)
            this.viewDate = new Date(this.o.startDate);
          else if (this.viewDate > this.o.endDate)
            this.viewDate = new Date(this.o.endDate);

          if (fromArgs) {
            // setting date by clicking
            this.setValue();
          } else if (dates.length) {
            // setting date by typing
            if (String(oldDates) !== String(this.dates))
              this._trigger('changeDate');
          }
          if (!this.dates.length && oldDates.length)
            this._trigger('clearDate');

          this.fill();
        },

        fillDow: function() {
          var dowCnt = this.o.weekStart,
            html = '<tr class="week-content">';
          if (this.o.calendarWeeks) {
            var cell = '<th class="cw">&nbsp;</th>';
            html += cell;
            this.picker.find('.datepicker-days thead tr:first-child').prepend(cell);
          }
          while (dowCnt < this.o.weekStart + 7) {
            html += '<th class="dow">' + dates[this.o.language].daysMin[(dowCnt++) % 7] + '</th>';
          }
          html += '</tr>';
          this.picker.find('.datepicker-days thead').append(html);
        },

        fillMonths: function() {
          var html = '',
            i = 0;
          while (i < 12) {
            html += '<span class="month">' + dates[this.o.language].monthsShort[i++] + '</span>';
          }
          this.picker.find('.datepicker-months td').html(html);
        },

        setRange: function(range) {
          if (!range || !range.length)
            delete this.range;
          else
            this.range = $.map(range, function(d) {
              return d.valueOf();
            });
          this.fill();
        },

        getClassNames: function(date) {
          var cls = [],
            year = this.viewDate.getUTCFullYear(),
            month = this.viewDate.getUTCMonth(),
            today = new Date();
          if (date.getUTCFullYear() < year || (date.getUTCFullYear() === year && date.getUTCMonth() < month)) {
            cls.push('old');
          } else if (date.getUTCFullYear() > year || (date.getUTCFullYear() === year && date.getUTCMonth() > month)) {
            cls.push('new');
          }
          if (this.focusDate && date.valueOf() === this.focusDate.valueOf())
            cls.push('focused');
          // Compare internal UTC date with local today, not UTC today
          if (this.o.todayHighlight &&
            date.getUTCFullYear() === today.getFullYear() &&
            date.getUTCMonth() === today.getMonth() &&
            date.getUTCDate() === today.getDate()) {
            cls.push('today');
          }
          if (this.dates.contains(date) !== -1)
            cls.push('active');
          if (date.valueOf() < this.o.startDate || date.valueOf() > this.o.endDate ||
            $.inArray(date.getUTCDay(), this.o.daysOfWeekDisabled) !== -1) {
            cls.push('disabled');
          }
          if (this.range) {
            if (date > this.range[0] && date < this.range[this.range.length - 1]) {
              cls.push('range');
            }
            if ($.inArray(date.valueOf(), this.range) !== -1) {
              cls.push('selected');
            }
          }
          return cls;
        },

        fill: function() {
          var d = new Date(this.viewDate),
            year = d.getUTCFullYear(),
            month = d.getUTCMonth(),
            startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
            startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
            endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
            endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity,
            todaytxt = dates[this.o.language].today || dates['en'].today || '',
            cleartxt = dates[this.o.language].clear || dates['en'].clear || '',
            tooltip;
          this.picker.find('.datepicker-days thead th.datepicker-switch')
            .text(year + '骞� ' + dates[this.o.language].months[month]);
          this.picker.find('tfoot th.today')
            .text(todaytxt)
            .toggle(this.o.todayBtn !== false);
          this.picker.find('tfoot th.clear')
            .text(cleartxt)
            .toggle(this.o.clearBtn !== false);
          this.updateNavArrows();
          this.fillMonths();
          var prevMonth = UTCDate(year, month - 1, 28),
            day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
          prevMonth.setUTCDate(day);
          prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7) % 7);
          var nextMonth = new Date(prevMonth);
          nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
          nextMonth = nextMonth.valueOf();
          var html = [];
          var clsName;
          while (prevMonth.valueOf() < nextMonth) {
            if (prevMonth.getUTCDay() === this.o.weekStart) {
              html.push('<tr>');
              if (this.o.calendarWeeks) {
                // ISO 8601: First week contains first thursday.
                // ISO also states week starts on Monday, but we can be more abstract here.
                var
                  // Start of current week: based on weekstart/current date
                  ws = new Date(+prevMonth + (this.o.weekStart - prevMonth.getUTCDay() - 7) % 7 * 864e5),
                  // Thursday of this week
                  th = new Date(Number(ws) + (7 + 4 - ws.getUTCDay()) % 7 * 864e5),
                  // First Thursday of year, year from thursday
                  yth = new Date(Number(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay()) % 7 * 864e5),
                  // Calendar week: ms between thursdays, div ms per day, div 7 days
                  calWeek = (th - yth) / 864e5 / 7 + 1;
                html.push('<td class="cw">' + calWeek + '</td>');

              }
            }
            clsName = this.getClassNames(prevMonth);
            clsName.push('day');

            if (this.o.beforeShowDay !== $.noop) {
              var before = this.o.beforeShowDay(this._utc_to_local(prevMonth));
              if (before === undefined)
                before = {};
              else if (typeof(before) === 'boolean')
                before = {
                  enabled: before
                };
              else if (typeof(before) === 'string')
                before = {
                  classes: before
                };
              if (before.enabled === false)
                clsName.push('disabled');
              if (before.classes)
                clsName = clsName.concat(before.classes.split(/\s+/));
              if (before.tooltip)
                tooltip = before.tooltip;
            }

            clsName = $.unique(clsName);
            var currentDate;
            var today = new Date();
            if (this.o.todayHighlight &&
              prevMonth.getUTCFullYear() === today.getFullYear() &&
              prevMonth.getUTCMonth() === today.getMonth() &&
              prevMonth.getUTCDate() === today.getDate()) {
              currentDate = '浠婃棩';
            } else {
              currentDate = prevMonth.getUTCDate();
            }
            html.push('<td class="' + clsName.join(' ') + '"' + (tooltip ? ' title="' + tooltip + '"' : '') + 'data-day="' + prevMonth.getUTCDate() + '"' + '>' + currentDate + '</td>');
            if (prevMonth.getUTCDay() === this.o.weekEnd) {
              html.push('</tr>');
            }
            prevMonth.setUTCDate(prevMonth.getUTCDate() + 1);
          }
          this.picker.find('.datepicker-days tbody').empty().append(html.join(''));

          var months = this.picker.find('.datepicker-months')
            .find('th:eq(1)')
            .text(year)
            .end()
            .find('span').removeClass('active');

          $.each(this.dates, function(i, d) {
            if (d.getUTCFullYear() === year)
              months.eq(d.getUTCMonth()).addClass('active');
          });

          if (year < startYear || year > endYear) {
            months.addClass('disabled');
          }
          if (year === startYear) {
            months.slice(0, startMonth).addClass('disabled');
          }
          if (year === endYear) {
            months.slice(endMonth + 1).addClass('disabled');
          }

          html = '';
          year = parseInt(year / 10, 10) * 10;
          var yearCont = this.picker.find('.datepicker-years')
            .find('th:eq(1)')
            .text(year + '-' + (year + 9))
            .end()
            .find('td');
          year -= 1;
          var years = $.map(this.dates, function(d) {
              return d.getUTCFullYear();
            }),
            classes;
          for (var i = -1; i < 11; i++) {
            classes = ['year'];
            if (i === -1)
              classes.push('old');
            else if (i === 10)
              classes.push('new');
            if ($.inArray(year, years) !== -1)
              classes.push('active');
            if (year < startYear || year > endYear)
              classes.push('disabled');
            html += '<span class="' + classes.join(' ') + '">' + year + '</span>';
            year += 1;
          }
          yearCont.html(html);
        },

        updateNavArrows: function() {
          if (!this._allow_update)
            return;

          var d = new Date(this.viewDate),
            year = d.getUTCFullYear(),
            month = d.getUTCMonth();
          switch (this.viewMode) {
            case 0:
              if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() && month <= this.o.startDate.getUTCMonth()) {
                this.picker.find('.prev').css({
                  visibility: 'hidden'
                });
              } else {
                this.picker.find('.prev').css({
                  visibility: 'visible'
                });
              }
              if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear() && month >= this.o.endDate.getUTCMonth()) {
                this.picker.find('.next').css({
                  visibility: 'hidden'
                });
              } else {
                this.picker.find('.next').css({
                  visibility: 'visible'
                });
              }
              break;
            case 1:
            case 2:
              if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear()) {
                this.picker.find('.prev').css({
                  visibility: 'hidden'
                });
              } else {
                this.picker.find('.prev').css({
                  visibility: 'visible'
                });
              }
              if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear()) {
                this.picker.find('.next').css({
                  visibility: 'hidden'
                });
              } else {
                this.picker.find('.next').css({
                  visibility: 'visible'
                });
              }
              break;
          }
        },

        click: function(e) {
          e.preventDefault();
          if ($(e.target).parents(".timepicker-container")[0]) {
            return;
          }
          var target = $(e.target).closest('span, td, th'),
            year, month, day;
          if (target.length === 1) {
            switch (target[0].nodeName.toLowerCase()) {
              case 'th':
                switch (target[0].className) {
                  case 'datepicker-switch':
                    this.showMode(1);
                    break;
                  case 'prev':
                  case 'next':
                    var dir = DPGlobal.modes[this.viewMode].navStep * (target[0].className === 'prev' ? -1 : 1);
                    switch (this.viewMode) {
                      case 0:
                        this.viewDate = this.moveMonth(this.viewDate, dir);
                        this._trigger('changeMonth', this.viewDate);
                        break;
                      case 1:
                      case 2:
                        this.viewDate = this.moveYear(this.viewDate, dir);
                        if (this.viewMode === 1)
                          this._trigger('changeYear', this.viewDate);
                        break;
                    }
                    this.fill();
                    break;
                  case 'today':
                    var date = new Date();
                    date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

                    this.showMode(-2);
                    var which = this.o.todayBtn === 'linked' ? null : 'view';
                    this._setDate(date, which);
                    break;
                  case 'clear':
                    var element;
                    if (this.isInput)
                      element = this.element;
                    else if (this.component)
                      element = this.element.find('input');
                    if (element)
                      element.val("").change();
                    this.update();
                    this._trigger('changeDate');
                    if (this.o.autoclose)
                      this.hide();
                    break;
                }
                break;
              case 'span':
                if (!target.is('.disabled') && !target.is('[data-num]')) {
                  this.viewDate.setUTCDate(1);
                  if (target.is('.month')) {
                    day = 1;
                    month = target.parent().find('span').index(target);
                    year = this.viewDate.getUTCFullYear();
                    this.viewDate.setUTCMonth(month);
                    this._trigger('changeMonth', this.viewDate);
                    if (this.o.minViewMode === 1) {
                      this._setDate(UTCDate(year, month, day));
                    }
                  } else {
                    day = 1;
                    month = 0;
                    year = parseInt(target.text(), 10) || 0;
                    this.viewDate.setUTCFullYear(year);
                    this._trigger('changeYear', this.viewDate);
                    if (this.o.minViewMode === 2) {
                      this._setDate(UTCDate(year, month, day));
                    }
                  }
                  this.showMode(-1);
                  this.fill();
                }
                break;
              case 'td':
                if (target.is('.day') && !target.is('.disabled')) {
                  day = target.data('day');
                  day = parseInt(day, 10) || 1;
                  year = this.viewDate.getUTCFullYear();
                  month = this.viewDate.getUTCMonth();
                  if (target.is('.old')) {
                    if (month === 0) {
                      month = 11;
                      year -= 1;
                    } else {
                      month -= 1;
                    }
                  } else if (target.is('.new')) {
                    if (month === 11) {
                      month = 0;
                      year += 1;
                    } else {
                      month += 1;
                    }
                  }
                  this._setDate(UTCDate(year, month, day));
                }
                break;
            }
          }
          if (this.picker.is(':visible') && this._focused_from) {
            $(this._focused_from).focus();
          }
          delete this._focused_from;
        },

        _toggle_multidate: function(date) {
          var ix = this.dates.contains(date);
          if (!date) {
            this.dates.clear();
          } else if (ix !== -1) {
            this.dates.remove(ix);
          } else {
            this.dates.push(date);
          }
          if (typeof this.o.multidate === 'number')
            while (this.dates.length > this.o.multidate)
              this.dates.remove(0);
        },

        _setDate: function(date, which) {
          if (!which || which === 'date')
            this._toggle_multidate(date && new Date(date));
          if (!which || which === 'view')
            this.viewDate = date && new Date(date);

          this.fill();
          this.setValue();
          this._trigger('changeDate');
          var element;
          if (this.isInput) {
            element = this.element;
          } else if (this.component) {
            element = this.element.find('input');
          }
          if (element) {
            element.change();
          }
          if (this.o.autoclose && (!which || which === 'date')) {
            this.hide();
          }
        },

        moveMonth: function(date, dir) {
          if (!date)
            return undefined;
          if (!dir)
            return date;
          var new_date = new Date(date.valueOf()),
            day = new_date.getUTCDate(),
            month = new_date.getUTCMonth(),
            mag = Math.abs(dir),
            new_month, test;
          dir = dir > 0 ? 1 : -1;
          if (mag === 1) {
            test = dir === -1
              // If going back one month, make sure month is not current month
              // (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
              ?
              function() {
                return new_date.getUTCMonth() === month;
              }
              // If going forward one month, make sure month is as expected
              // (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
              :
              function() {
                return new_date.getUTCMonth() !== new_month;
              };
            new_month = month + dir;
            new_date.setUTCMonth(new_month);
            // Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
            if (new_month < 0 || new_month > 11)
              new_month = (new_month + 12) % 12;
          } else {
            // For magnitudes >1, move one month at a time...
            for (var i = 0; i < mag; i++)
              // ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
              new_date = this.moveMonth(new_date, dir);
            // ...then reset the day, keeping it in the new month
            new_month = new_date.getUTCMonth();
            new_date.setUTCDate(day);
            test = function() {
              return new_month !== new_date.getUTCMonth();
            };
          }
          // Common date-resetting loop -- if date is beyond end of month, make it
          // end of month
          while (test()) {
            new_date.setUTCDate(--day);
            new_date.setUTCMonth(new_month);
          }
          return new_date;
        },

        moveYear: function(date, dir) {
          return this.moveMonth(date, dir * 12);
        },

        dateWithinRange: function(date) {
          return date >= this.o.startDate && date <= this.o.endDate;
        },

        keydown: function(e) {
          if (this.picker.is(':not(:visible)')) {
            if (e.keyCode === 27) // allow escape to hide and re-show picker
              this.show();
            return;
          }
          var dateChanged = false,
            dir, newDate, newViewDate,
            focusDate = this.focusDate || this.viewDate;
          switch (e.keyCode) {
            case 27: // escape
              if (this.focusDate) {
                this.focusDate = null;
                this.viewDate = this.dates.get(-1) || this.viewDate;
                this.fill();
              } else
                this.hide();
              e.preventDefault();
              break;
            case 37: // left
            case 39: // right
              if (!this.o.keyboardNavigation)
                break;
              dir = e.keyCode === 37 ? -1 : 1;
              if (e.ctrlKey) {
                newDate = this.moveYear(this.dates.get(-1) || UTCToday(), dir);
                newViewDate = this.moveYear(focusDate, dir);
                this._trigger('changeYear', this.viewDate);
              } else if (e.shiftKey) {
                newDate = this.moveMonth(this.dates.get(-1) || UTCToday(), dir);
                newViewDate = this.moveMonth(focusDate, dir);
                this._trigger('changeMonth', this.viewDate);
              } else {
                newDate = new Date(this.dates.get(-1) || UTCToday());
                newDate.setUTCDate(newDate.getUTCDate() + dir);
                newViewDate = new Date(focusDate);
                newViewDate.setUTCDate(focusDate.getUTCDate() + dir);
              }
              if (this.dateWithinRange(newDate)) {
                this.focusDate = this.viewDate = newViewDate;
                this.setValue();
                this.fill();
                e.preventDefault();
              }
              break;
            case 38: // up
            case 40: // down
              if (!this.o.keyboardNavigation)
                break;
              dir = e.keyCode === 38 ? -1 : 1;
              if (e.ctrlKey) {
                newDate = this.moveYear(this.dates.get(-1) || UTCToday(), dir);
                newViewDate = this.moveYear(focusDate, dir);
                this._trigger('changeYear', this.viewDate);
              } else if (e.shiftKey) {
                newDate = this.moveMonth(this.dates.get(-1) || UTCToday(), dir);
                newViewDate = this.moveMonth(focusDate, dir);
                this._trigger('changeMonth', this.viewDate);
              } else {
                newDate = new Date(this.dates.get(-1) || UTCToday());
                newDate.setUTCDate(newDate.getUTCDate() + dir * 7);
                newViewDate = new Date(focusDate);
                newViewDate.setUTCDate(focusDate.getUTCDate() + dir * 7);
              }
              if (this.dateWithinRange(newDate)) {
                this.focusDate = this.viewDate = newViewDate;
                this.setValue();
                this.fill();
                e.preventDefault();
              }
              break;
            case 32: // spacebar
              // Spacebar is used in manually typing dates in some formats.
              // As such, its behavior should not be hijacked.
              break;
            case 13: // enter
              focusDate = this.focusDate || this.dates.get(-1) || this.viewDate;
              this._toggle_multidate(focusDate);
              dateChanged = true;
              this.focusDate = null;
              this.viewDate = this.dates.get(-1) || this.viewDate;
              this.setValue();
              this.fill();
              if (this.picker.is(':visible')) {
                e.preventDefault();
                if (this.o.autoclose)
                  this.hide();
              }
              break;
            case 9: // tab
              this.focusDate = null;
              this.viewDate = this.dates.get(-1) || this.viewDate;
              this.fill();
              this.hide();
              break;
          }
          if (dateChanged) {
            if (this.dates.length)
              this._trigger('changeDate');
            else
              this._trigger('clearDate');
            var element;
            if (this.isInput) {
              element = this.element;
            } else if (this.component) {
              element = this.element.find('input');
            }
            if (element) {
              element.change();
            }
          }
        },

        showMode: function(dir) {
          if (dir) {
            this.viewMode = Math.max(this.o.minViewMode, Math.min(2, this.viewMode + dir));
          }
          this.picker
            .find('>div')
            .hide()
            .filter('.datepicker-' + DPGlobal.modes[this.viewMode].clsName)
            .css('display', 'block');
          this.updateNavArrows();
        }
      };

      var DateRangePicker = function(element, options) {
        this.element = $(element);
        this.inputs = $.map(options.inputs, function(i) {
          return i.jquery ? i[0] : i;
        });
        delete options.inputs;

        $(this.inputs)
          .datepicker(options)
          .bind('changeDate', $.proxy(this.dateUpdated, this));

        this.pickers = $.map(this.inputs, function(i) {
          return $(i).data('datepicker');
        });
        this.updateDates();
      };
      DateRangePicker.prototype = {
        updateDates: function() {
          this.dates = $.map(this.pickers, function(i) {
            return i.getUTCDate();
          });
          this.updateRanges();
        },
        updateRanges: function() {
          var range = $.map(this.dates, function(d) {
            return d.valueOf();
          });
          $.each(this.pickers, function(i, p) {
            p.setRange(range);
          });
        },
        dateUpdated: function(e) {
          // `this.updating` is a workaround for preventing infinite recursion
          // between `changeDate` triggering and `setUTCDate` calling.  Until
          // there is a better mechanism.
          if (this.updating)
            return;
          this.updating = true;

          var dp = $(e.target).data('datepicker'),
            new_date = dp.getUTCDate(),
            i = $.inArray(e.target, this.inputs),
            l = this.inputs.length;
          if (i === -1)
            return;

          $.each(this.pickers, function(i, p) {
            if (!p.getUTCDate())
              p.setUTCDate(new_date);
          });

          //涓存椂淇閫夋嫨鍚庨潰鐨勬棩鏈熶笉浼氳嚜鍔ㄤ慨姝ｅ墠闈㈡棩鏈熺殑bug
          var j = 0;
          for (j = 0; j < this.pickers.length; j++) {
            this.dates[j] = this.pickers[j].getDate();
          }
          j = i - 1;
          while (j >= 0 && new_date < this.dates[j]) {
            this.pickers[j--].setUTCDate(new_date);
          }

          if (new_date < this.dates[i]) {
            // Date being moved earlier/left
            while (i >= 0 && new_date < this.dates[i]) {
              this.pickers[i--].setUTCDate(new_date);
            }
          } else if (new_date > this.dates[i]) {
            // Date being moved later/right
            while (i < l && new_date > this.dates[i]) {
              this.pickers[i++].setUTCDate(new_date);
            }
          }
          this.updateDates();

          delete this.updating;
        },
        remove: function() {
          $.map(this.pickers, function(p) {
            p.remove();
          });
          delete this.element.data().datepicker;
        }
      };

      function opts_from_el(el, prefix) {
        // Derive options from element data-attrs
        var data = $(el).data(),
          out = {},
          inkey,
          replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])');
        prefix = new RegExp('^' + prefix.toLowerCase());

        function re_lower(_, a) {
          return a.toLowerCase();
        }
        for (var key in data)
          if (prefix.test(key)) {
            inkey = key.replace(replace, re_lower);
            out[inkey] = data[key];
          }
        return out;
      }

      function opts_from_locale(lang) {
        // Derive options from locale plugins
        var out = {};
        // Check if "de-DE" style date is available, if not language should
        // fallback to 2 letter code eg "de"
        if (!dates[lang]) {
          lang = lang.split('-')[0];
          if (!dates[lang])
            return;
        }
        var d = dates[lang];
        $.each(locale_opts, function(i, k) {
          if (k in d)
            out[k] = d[k];
        });
        return out;
      }

      var old = $.fn.datepicker;
      $.fn.datepicker = function(option) {
        var args = Array.apply(null, arguments);
        args.shift();
        var internal_return;
        this.each(function() {
          var $this = $(this),
            data = $this.data('datepicker'),
            options = typeof option === 'object' && option;
          if (!data) {
            var elopts = opts_from_el(this, 'date'),
              // Preliminary otions
              xopts = $.extend({}, defaults, elopts, options),
              locopts = opts_from_locale(xopts.language),
              // Options priority: js args, data-attrs, locales, defaults
              opts = $.extend({}, defaults, locopts, elopts, options);
            if ($this.is('.input-daterange') || opts.inputs) {
              var ropts = {
                inputs: opts.inputs || $this.find('input').toArray()
              };
              $this.data('datepicker', (data = new DateRangePicker(this, $.extend(opts, ropts))));
            } else {
              $this.data('datepicker', (data = new Datepicker(this, opts)));
            }
          }
          if (typeof option === 'string' && typeof data[option] === 'function') {
            internal_return = data[option].apply(data, args);
            if (internal_return !== undefined)
              return false;
          }
        });
        if (internal_return !== undefined)
          return internal_return;
        else
          return this;
      };

      var defaults = $.fn.datepicker.defaults = {
        autoclose: true,
        beforeShowDay: $.noop,
        calendarWeeks: false,
        clearBtn: false,
        daysOfWeekDisabled: [],
        endDate: Infinity,
        forceParse: true,
        format: 'yyyy-mm-dd',
        keyboardNavigation: true,
        language: 'zh-CN',
        minViewMode: 0,
        multidate: false,
        multidateSeparator: ',',
        orientation: "auto",
        rtl: false,
        size: '',
        startDate: -Infinity,
        startView: 0,
        todayBtn: false,
        todayHighlight: true,
        weekStart: 0,
        timepicker: false,
      };
      var locale_opts = $.fn.datepicker.locale_opts = [
        'format',
        'rtl',
        'weekStart'
      ];
      $.fn.datepicker.Constructor = Datepicker;
      var dates = $.fn.datepicker.dates = {
        "en": {
          days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
          months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
          monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          today: "Today",
          clear: "Clear"
        },
        "zh-CN": {
          days: ["鏄熸湡鏃�", "鏄熸湡涓€", "鏄熸湡浜�", "鏄熸湡涓�", "鏄熸湡鍥�", "鏄熸湡浜�", "鏄熸湡鍏�", "鏄熸湡鏃�"],
          daysShort: ["鍛ㄦ棩", "鍛ㄤ竴", "鍛ㄤ簩", "鍛ㄤ笁", "鍛ㄥ洓", "鍛ㄤ簲", "鍛ㄥ叚", "鍛ㄦ棩"],
          daysMin: ["鏃�", "涓€", "浜�", "涓�", "鍥�", "浜�", "鍏�", "鏃�"],
          months: ["1鏈�", "2鏈�", "3鏈�", "4鏈�", "5鏈�", "6鏈�", "7鏈�", "8鏈�", "9鏈�", "10鏈�", "11鏈�", "12鏈�"],
          monthsShort: ["1鏈�", "2鏈�", "3鏈�", "4鏈�", "5鏈�", "6鏈�", "7鏈�", "8鏈�", "9鏈�", "10鏈�", "11鏈�", "12鏈�"],
          today: "浠婃棩",
          weekStart: 0
        }
      };

      var DPGlobal = {
        modes: [{
          clsName: 'days',
          navFnc: 'Month',
          navStep: 1
        }, {
          clsName: 'months',
          navFnc: 'FullYear',
          navStep: 1
        }, {
          clsName: 'years',
          navFnc: 'FullYear',
          navStep: 10
        }],
        isLeapYear: function(year) {
          return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
        },
        getDaysInMonth: function(year, month) {
          return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
        },
        validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
        nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
        parseFormat: function(format) {
          // IE treats \0 as a string end in inputs (truncating the value),
          // so it's a bad format delimiter, anyway
          var separators = format.replace(this.validParts, '\0').split('\0'),
            parts = format.match(this.validParts);
          if (!separators || !separators.length || !parts || parts.length === 0) {
            throw new Error("Invalid date format.");
          }
          return {
            separators: separators,
            parts: parts
          };
        },
        parseDate: function(date, format, language) {
          if (!date)
            return undefined;
          if (date instanceof Date)
            return date;
          if (typeof format === 'string')
            format = DPGlobal.parseFormat(format);
          var part_re = /([\-+]\d+)([dmwy])/,
            parts = date.match(/([\-+]\d+)([dmwy])/g),
            part, dir, i;
          if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)) {
            date = new Date();
            for (i = 0; i < parts.length; i++) {
              part = part_re.exec(parts[i]);
              dir = parseInt(part[1]);
              switch (part[2]) {
                case 'd':
                  date.setUTCDate(date.getUTCDate() + dir);
                  break;
                case 'm':
                  date = Datepicker.prototype.moveMonth.call(Datepicker.prototype, date, dir);
                  break;
                case 'w':
                  date.setUTCDate(date.getUTCDate() + dir * 7);
                  break;
                case 'y':
                  date = Datepicker.prototype.moveYear.call(Datepicker.prototype, date, dir);
                  break;
              }
            }
            return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0);
          }
          parts = date && date.match(this.nonpunctuation) || [];
          date = new Date();
          var parsed = {},
            setters_order = ['yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'd', 'dd'],
            setters_map = {
              yyyy: function(d, v) {
                return d.setUTCFullYear(v);
              },
              yy: function(d, v) {
                return d.setUTCFullYear(2000 + v);
              },
              m: function(d, v) {
                if (isNaN(d))
                  return d;
                v -= 1;
                while (v < 0) v += 12;
                v %= 12;
                d.setUTCMonth(v);
                while (d.getUTCMonth() !== v)
                  d.setUTCDate(d.getUTCDate() - 1);
                return d;
              },
              d: function(d, v) {
                return d.setUTCDate(v);
              }
            },
            val, filtered;
          setters_map['M'] = setters_map['MM'] = setters_map['mm'] = setters_map['m'];
          setters_map['dd'] = setters_map['d'];
          date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
          var fparts = format.parts.slice();
          // Remove noop parts
          if (parts.length !== fparts.length) {
            fparts = $(fparts).filter(function(i, p) {
              return $.inArray(p, setters_order) !== -1;
            }).toArray();
          }
          // Process remainder
          function match_part() {
            var m = this.slice(0, parts[i].length),
              p = parts[i].slice(0, m.length);
            return m === p;
          }
          if (parts.length === fparts.length) {
            var cnt;
            for (i = 0, cnt = fparts.length; i < cnt; i++) {
              val = parseInt(parts[i], 10);
              part = fparts[i];
              if (isNaN(val)) {
                switch (part) {
                  case 'MM':
                    filtered = $(dates[language].months).filter(match_part);
                    val = $.inArray(filtered[0], dates[language].months) + 1;
                    break;
                  case 'M':
                    filtered = $(dates[language].monthsShort).filter(match_part);
                    val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
                    break;
                }
              }
              parsed[part] = val;
            }
            var _date, s;
            for (i = 0; i < setters_order.length; i++) {
              s = setters_order[i];
              if (s in parsed && !isNaN(parsed[s])) {
                _date = new Date(date);
                setters_map[s](_date, parsed[s]);
                if (!isNaN(_date))
                  date = _date;
              }
            }
          }
          return date;
        },
        formatDate: function(date, format, language) {
          if (!date)
            return '';
          if (typeof format === 'string')
            format = DPGlobal.parseFormat(format);
          var val = {
            d: date.getUTCDate(),
            D: dates[language].daysShort[date.getUTCDay()],
            DD: dates[language].days[date.getUTCDay()],
            m: date.getUTCMonth() + 1,
            M: dates[language].monthsShort[date.getUTCMonth()],
            MM: dates[language].months[date.getUTCMonth()],
            yy: date.getUTCFullYear().toString().substring(2),
            yyyy: date.getUTCFullYear()
          };
          val.dd = (val.d < 10 ? '0' : '') + val.d;
          val.mm = (val.m < 10 ? '0' : '') + val.m;
          date = [];
          var seps = $.extend([], format.separators);
          for (var i = 0, cnt = format.parts.length; i <= cnt; i++) {
            if (seps.length)
              date.push(seps.shift());
            date.push(val[format.parts[i]]);
          }
          return date.join('');
        },
        headTemplate: '<thead>' +
          '<tr class="date-header">' +
          '<th class="prev"><b></b></th>' +
          '<th colspan="5" class="datepicker-switch"></th>' +
          '<th class="next"><b></b></th>' +
          '</tr>' +
          '</thead>',
        contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
        footTemplate: '<tfoot>' +
          '<tr>' +
          '<th colspan="7" class="today"></th>' +
          '</tr>' +
          '<tr>' +
          '<th colspan="7" class="clear"></th>' +
          '</tr>' +
          '</tfoot>',
        timepicerTemplate: '<div class="timepicker-container"></div>'
      };
      DPGlobal.template = '<div class="datepicker">' +
        '<div class="datepicker-days clearfix">' +
        '<table class=" table-condensed">' +
        DPGlobal.headTemplate +
        '<tbody></tbody>' +
        DPGlobal.footTemplate +
        '</table>' +
        DPGlobal.timepicerTemplate +
        '</div>' +
        '<div class="datepicker-months">' +
        '<table class="table-condensed">' +
        DPGlobal.headTemplate +
        DPGlobal.contTemplate +
        DPGlobal.footTemplate +
        '</table>' +
        '</div>' +
        '<div class="datepicker-years">' +
        '<table class="table-condensed">' +
        DPGlobal.headTemplate +
        DPGlobal.contTemplate +
        DPGlobal.footTemplate +
        '</table>' +
        '</div>' +
        '</div>';

      $.fn.datepicker.DPGlobal = DPGlobal;


      /* DATEPICKER NO CONFLICT
       * =================== */

      $.fn.datepicker.noConflict = function() {
        $.fn.datepicker = old;
        return this;
      };


      /* DATEPICKER DATA-API
       * ================== */

      $(document).on(
        'focus.datepicker.data-api click.datepicker.data-api',
        '[data-toggle="datepicker"]',
        function(e) {
          var $this = $(this);
          if ($this.data('datepicker'))
            return;
          e.preventDefault();
          // component click requires us to explicitly show it
          $this.datepicker('show');
        }
      );
      $(function() {
        $('[data-toggle="datepicker-inline"]').datepicker();
      });

    }(window.jQuery, undefined);

  }, {}],
  6: [function(require, module, exports) {
    //proxy dropdown to document, so there is no need to init
    ! function($) {

      "use strict";
      var toggleSelector = '[data-toggle=dropdown]',
        containerClass = ".sui-dropdown, .sui-dropup";
      var clearMenus = function() {
        $('.sui-dropdown.open, .sui-dropup.open, .sui-btn-group.open').each(function() {
          $(this).removeClass('open')
        })
      }
      var getContainer = function($el) {
        var $parent = $el.parent()
        if ($parent.hasClass("dropdown-inner")) return $parent.parent()
        return $parent;
      }
      var show = function() {
        clearMenus()
        var $el = $(this),
          $container = getContainer($el);
        if ($container.is('.disabled, :disabled')) return
        $container.addClass("open")
        $el.focus()
        return false;
      }
      var hide = function() {
        var $el = $(this),
          $container = getContainer($el);
        if ($container.is('.disabled, :disabled')) return
        $container.removeClass("open")
        $el.focus()
        return false;
      }

      var toggle = function() {
        var $el = $(this),
          $container = getContainer($el),
          active = $container.hasClass("open");
        clearMenus()
        if ($container.is('.disabled, :disabled')) return
        if (active) $container.removeClass("open")
        else $container.addClass("open")
        $el.focus()
        return false;
      }

      var setValue = function() {
        var $target = $(this),
          $li = $target.parent(),
          $container = $target.parents(".sui-dropdown, .sui-dropup"),
          $menu = $container.find("[role='menu']");
        if ($li.is(".disabled, :disabled")) return;
        if ($container.is('.disabled, :disabled')) return;
        $container.find("input").val($target.attr("value") || "").trigger("change")
        $container.find(toggleSelector + ' span').html($target.html())
        $menu.find(".active").removeClass("active")
        $li.addClass("active")
      }


      $(document).on("mouseover", containerClass, function() {
        var $container = $(this),
          el;
        if (el = $container.find('[data-trigger="hover"]')[0]) show.call(el);
      })
      $(document).on("mouseleave", containerClass, function() {
        var $container = $(this),
          el;
        if (el = $container.find('[data-trigger="hover"]')[0]) hide.call(el);
      })
      $(document).on("click", "[data-toggle='dropdown']", toggle)
      $(document).on("click", function() {
        var $this = $(this);
        if (!($this.is(containerClass) || $this.parents(containerClass)[0])) clearMenus()
      })

      $(document).on("click", ".select .sui-dropdown-menu a", setValue)


      // Dropdown api
      $.fn.dropdown = function(option) {
        return this.each(function() {
          $(this).attr("data-toggle", "dropdown");
          if (typeof option == 'string') {
            switch (option) {
              case "show":
                show.call(this);
                break;
              case "hide":
                hide.call(this);
                break;
              case "toggle":
                toggle.call(this);
                break;
            }
          }
        });
      }

    }(window.jQuery);

  }, {}],
  7: [function(require, module, exports) {
    ! function($) {
      /**
       * filesize  鑾峰緱璁＄畻鏈烘枃浠朵綋绉ぇ灏�(byte)瀵逛汉鏇村弸濂界殑鏍煎紡
       * @param  {number | string}  鍙纭浆涓烘暟瀛楃殑鏁板瓧锛坕nt銆乫loat锛夈€佸瓧绗︿覆
       * @param  {Object} opt 鍙€夌殑閰嶇疆锛岀洰鍓嶅彧鏈変繚鐣欑殑灏忔暟浣嶆暟锛岄粯璁や负2
       */
      "use strict";
      $.extend({
        filesize: function(arg, options) {
          var result = "",
            opt = options || {},
            num = Number(arg),
            bytes = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
            round = opt.round !== undefined ? opt.round : 2,
            e;

          if (isNaN(arg) || num < 0) {
            throw new Error("鏃犳晥鐨剆ize鍙傛暟");
          }

          if (num === 0) {
            result = "0B";
          } else {
            e = Math.floor(Math.log(num) / Math.log(1000));

            if (e > 8) {
              result = result * (1000 * (e - 8));
              e = 8;
            }

            result = num / Math.pow(2, (e * 10));

            result = result.toFixed(e > 0 ? round : 0) + bytes[e];
          }

          return result;
        }
      })
    }(jQuery);

  }, {}],
  8: [function(require, module, exports) {
    /*jshint scripturl:true */
    /*jshint funcscope:true */
    /*jshint -W004 */
    /**
     * Intro.js v0.9.0
     * https://github.com/usablica/intro.js
     * MIT licensed
     *
     * Copyright (C) 2013 usabli.ca - A weekend project by Afshin Mehrabani (@afshinmeh)
     */

    ! function($) {
      //Default config/variables
      var VERSION = '0.9.0';

      /**
       * IntroJs main class
       *
       * @class IntroJs
       */

      function IntroJs(obj, options) {
        this._targetElement = obj;

        this._options = getOptions(options);

      }

      function getOptions(options) {
        return options = $.extend({}, IntroJs.prototype.defaults, options);
      }
      /**
       * Initiate a new introduction/guide from an element in the page
       *
       * @api private
       * @method _introForElement
       * @param {Object} targetElm
       * @returns {Boolean} Success or not?
       */
      function _introForElement(targetElm) {
        var introItems = [],
          self = this;
        var allIntroSteps = [];
        if (this._options.steps) {
          //use steps passed programmatically


          for (var i = 0, stepsLength = this._options.steps.length; i < stepsLength; i++) {
            var currentItem = _cloneObject(this._options.steps[i]);
            //set the step
            currentItem.step = introItems.length + 1;
            //use querySelector function only when developer used CSS selector
            if (typeof(currentItem.element) === 'string') {
              //grab the element with given selector from the page
              currentItem.element = document.querySelector(currentItem.element);
            }

            //intro without element
            if (typeof(currentItem.element) === 'undefined' || currentItem.element === null) {
              var floatingElementQuery = document.querySelector(".introjsFloatingElement");

              if (floatingElementQuery === null) {
                floatingElementQuery = document.createElement('div');
                floatingElementQuery.className = 'introjsFloatingElement';

                document.body.appendChild(floatingElementQuery);
              }

              currentItem.element = floatingElementQuery;
              currentItem.position = 'floating';
            }

            if (currentItem.element !== null) {
              introItems.push(currentItem);
            }
          }

        } else {
          //use steps from data-* annotations
          allIntroSteps = targetElm.querySelectorAll('*[data-intro]');
          //if there's no element to intro
          if (allIntroSteps.length < 1) {
            return false;
          }

          //first add intro items with data-step
          for (var i = 0, elmsLength = allIntroSteps.length; i < elmsLength; i++) {
            var currentElement = allIntroSteps[i];
            var step = parseInt(currentElement.getAttribute('data-step'), 10);

            if (step > 0) {
              introItems[step - 1] = {
                element: currentElement,
                intro: currentElement.getAttribute('data-intro'),
                step: parseInt(currentElement.getAttribute('data-step'), 10),
                tooltipClass: currentElement.getAttribute('data-tooltipClass'),
                position: currentElement.getAttribute('data-position') || this._options.tooltipPosition
              };
            }
          }

          //next add intro items without data-step
          //todo: we need a cleanup here, two loops are redundant
          var nextStep = 0;
          for (var i = 0, elmsLength = allIntroSteps.length; i < elmsLength; i++) {
            var currentElement = allIntroSteps[i];

            if (currentElement.getAttribute('data-step') === null) {

              while (true) {
                if (typeof introItems[nextStep] === 'undefined') {
                  break;
                } else {
                  nextStep++;
                }
              }

              introItems[nextStep] = {
                element: currentElement,
                intro: currentElement.getAttribute('data-intro'),
                step: nextStep + 1,
                tooltipClass: currentElement.getAttribute('data-tooltipClass'),
                position: currentElement.getAttribute('data-position') || this._options.tooltipPosition
              };
            }
          }
        }

        //removing undefined/null elements
        var tempIntroItems = [];
        for (var z = 0; z < introItems.length; z++) {
          introItems[z] && tempIntroItems.push(introItems[z]); // copy non-empty values to the end of the array
        }

        introItems = tempIntroItems;

        //Ok, sort all items with given steps
        introItems.sort(function(a, b) {
          return a.step - b.step;
        });

        //set it to the introJs object
        self._introItems = introItems;

        //add overlay layer to the page
        if (_addOverlayLayer.call(self, targetElm)) {
          //then, start the show
          _nextStep.call(self);

          var skipButton = targetElm.querySelector('.introjs-skipbutton'),
            nextStepButton = targetElm.querySelector('.introjs-nextbutton');

          self._onKeyDown = function(e) {
            if (e.keyCode === 27 && self._options.exitOnEsc === true) {
              //escape key pressed, exit the intro
              _exitIntro.call(self, targetElm);
              //check if any callback is defined
              if (self._introExitCallback !== undefined) {
                self._introExitCallback.call(self);
              }
            } else if (e.keyCode === 37) {
              //left arrow
              _previousStep.call(self);
            } else if (e.keyCode === 39 || e.keyCode === 13) {
              //right arrow or enter
              _nextStep.call(self);
              //prevent default behaviour on hitting Enter, to prevent steps being skipped in some browsers
              if (e.preventDefault) {
                e.preventDefault();
              } else {
                e.returnValue = false;
              }
            }
          };

          self._onResize = function(e) {
            _setHelperLayerPosition.call(self, document.querySelector('.sui-introjs-helperLayer'));
          };

          if (window.addEventListener) {
            if (this._options.keyboardNavigation) {
              window.addEventListener('keydown', self._onKeyDown, true);
            }
            //for window resize
            window.addEventListener("resize", self._onResize, true);
          } else if (document.attachEvent) { //IE
            if (this._options.keyboardNavigation) {
              document.attachEvent('onkeydown', self._onKeyDown);
            }
            //for window resize
            document.attachEvent("onresize", self._onResize);
          }
        }
        return false;
      }

      /*
       * makes a copy of the object
       * @api private
       * @method _cloneObject
       */
      function _cloneObject(object) {
        if (object === null || typeof(object) !== 'object' || typeof(object.nodeType) !== 'undefined') {
          return object;
        }
        var temp = {};
        for (var key in object) {
          temp[key] = _cloneObject(object[key]);
        }
        return temp;
      }
      /**
       * Go to specific step of introduction
       *
       * @api private
       * @method _goToStep
       */
      function _goToStep(step) {
        //because steps starts with zero
        this._currentStep = step - 2;
        if (typeof(this._introItems) !== 'undefined') {
          _nextStep.call(this);
        }
      }

      /**
       * Go to next step on intro
       *
       * @api private
       * @method _nextStep
       */
      function _nextStep() {
        this._direction = 'forward';

        if (typeof(this._currentStep) === 'undefined') {
          this._currentStep = 0;
        } else {
          ++this._currentStep;
        }

        if ((this._introItems.length) <= this._currentStep) {
          //end of the intro
          //check if any callback is defined
          if (typeof(this._introCompleteCallback) === 'function') {
            this._introCompleteCallback.call(this);
          }
          _exitIntro.call(this, this._targetElement);
          return;
        }

        var nextStep = this._introItems[this._currentStep];
        if (typeof(this._introBeforeChangeCallback) !== 'undefined') {
          this._introBeforeChangeCallback.call(this, nextStep.element);
        }

        _showElement.call(this, nextStep);
      }

      /**
       * Go to previous step on intro
       *
       * @api private
       * @method _nextStep
       */
      function _previousStep() {
        this._direction = 'backward';

        if (this._currentStep === 0) {
          return false;
        }

        var nextStep = this._introItems[--this._currentStep];
        if (typeof(this._introBeforeChangeCallback) !== 'undefined') {
          this._introBeforeChangeCallback.call(this, nextStep.element);
        }

        _showElement.call(this, nextStep);
      }

      /**
       * Exit from intro
       *
       * @api private
       * @method _exitIntro
       * @param {Object} targetElement
       */
      function _exitIntro(targetElement) {
        //remove overlay layer from the page
        var overlayLayer = targetElement.querySelector('.sui-introjs-overlay');

        //return if intro already completed or skipped
        if (overlayLayer === null) {
          return;
        }

        //for fade-out animation
        overlayLayer.style.opacity = 0;
        setTimeout(function() {
          if (overlayLayer.parentNode) {
            overlayLayer.parentNode.removeChild(overlayLayer);
          }
        }, 500);

        //remove all helper layers
        var helperLayer = targetElement.querySelector('.sui-introjs-helperLayer');
        if (helperLayer) {
          helperLayer.parentNode.removeChild(helperLayer);
        }

        //remove intro floating element
        var floatingElement = document.querySelector('.introjsFloatingElement');
        if (floatingElement) {
          floatingElement.parentNode.removeChild(floatingElement);
        }

        //remove `introjs-showElement` class from the element
        var showElement = document.querySelector('.introjs-showElement');
        if (showElement) {
          showElement.className = showElement.className.replace(/introjs-[a-zA-Z]+/g, '').replace(/^\s+|\s+$/g, ''); // This is a manual trim.
        }

        //remove `introjs-fixParent` class from the elements
        var fixParents = document.querySelectorAll('.introjs-fixParent');
        if (fixParents && fixParents.length > 0) {
          for (var i = fixParents.length - 1; i >= 0; i--) {
            fixParents[i].className = fixParents[i].className.replace(/introjs-fixParent/g, '').replace(/^\s+|\s+$/g, '');
          }
        }

        //clean listeners
        if (window.removeEventListener) {
          window.removeEventListener('keydown', this._onKeyDown, true);
        } else if (document.detachEvent) { //IE
          document.detachEvent('onkeydown', this._onKeyDown);
        }

        //set the step to zero
        this._currentStep = undefined;
      }

      /**
       * Render tooltip box in the page
       *
       * @api private
       * @method _placeTooltip
       * @param {Object} targetElement
       * @param {Object} tooltipLayer
       * @param {Object} arrowLayer
       */
      function _placeTooltip(targetElement, tooltipLayer, arrowLayer, helperNumberLayer) {
        var tooltipCssClass = '',
          currentStepObj,
          tooltipOffset,
          targetElementOffset;

        //reset the old style
        tooltipLayer.style.top = null;
        tooltipLayer.style.right = null;
        tooltipLayer.style.bottom = null;
        tooltipLayer.style.left = null;
        tooltipLayer.style.marginLeft = null;
        tooltipLayer.style.marginTop = null;

        arrowLayer.style.display = 'inherit';

        if (typeof(helperNumberLayer) !== 'undefined' && helperNumberLayer !== null) {
          helperNumberLayer.style.top = null;
          helperNumberLayer.style.left = null;
        }

        //prevent error when `this._currentStep` is undefined
        if (!this._introItems[this._currentStep]) return;

        //if we have a custom css class for each step
        currentStepObj = this._introItems[this._currentStep];
        if (typeof(currentStepObj.tooltipClass) === 'string') {
          tooltipCssClass = currentStepObj.tooltipClass;
        } else {
          tooltipCssClass = this._options.tooltipClass;
        }

        tooltipLayer.className = ('introjs-tooltip ' + tooltipCssClass).replace(/^\s+|\s+$/g, '');

        //custom css class for tooltip boxes
        var tooltipCssClass = this._options.tooltipClass;

        currentTooltipPosition = this._introItems[this._currentStep].position;
        switch (currentTooltipPosition) {
          case 'top':
            tooltipLayer.style.left = '15px';
            tooltipLayer.style.top = '-' + (_getOffset(tooltipLayer).height + 10) + 'px';
            arrowLayer.className = 'introjs-arrow bottom';
            break;
          case 'right':
            tooltipLayer.style.left = (_getOffset(targetElement).width + 20) + 'px';
            arrowLayer.className = 'introjs-arrow left';
            break;
          case 'left':
            if (this._options.showStepNumbers === true) {
              tooltipLayer.style.top = '15px';
            }
            tooltipLayer.style.right = (_getOffset(targetElement).width + 20) + 'px';
            arrowLayer.className = 'introjs-arrow right';
            break;
          case 'floating':
            arrowLayer.style.display = 'none';

            //we have to adjust the top and left of layer manually for intro items without element
            tooltipOffset = _getOffset(tooltipLayer);

            tooltipLayer.style.left = '50%';
            tooltipLayer.style.top = '50%';
            tooltipLayer.style.marginLeft = '-' + (tooltipOffset.width / 2) + 'px';
            tooltipLayer.style.marginTop = '-' + (tooltipOffset.height / 2) + 'px';

            if (typeof(helperNumberLayer) !== 'undefined' && helperNumberLayer !== null) {
              helperNumberLayer.style.left = '-' + ((tooltipOffset.width / 2) + 18) + 'px';
              helperNumberLayer.style.top = '-' + ((tooltipOffset.height / 2) + 18) + 'px';
            }

            break;
          case 'bottom-right-aligned':
            arrowLayer.className = 'introjs-arrow top-right';
            tooltipLayer.style.right = '0px';
            tooltipLayer.style.bottom = '-' + (_getOffset(tooltipLayer).height + 10) + 'px';
            break;
          case 'bottom-middle-aligned':
            targetElementOffset = _getOffset(targetElement);
            tooltipOffset = _getOffset(tooltipLayer);

            arrowLayer.className = 'introjs-arrow top-middle';
            tooltipLayer.style.left = (targetElementOffset.width / 2 - tooltipOffset.width / 2) + 'px';
            tooltipLayer.style.bottom = '-' + (tooltipOffset.height + 10) + 'px';
            break;
          default:
            tooltipLayer.style.bottom = '-' + (_getOffset(tooltipLayer).height + 10) + 'px';
            arrowLayer.className = 'introjs-arrow top';
            break;
        }
      }

      /**
       * Update the position of the helper layer on the screen
       *
       * @api private
       * @method _setHelperLayerPosition
       * @param {Object} helperLayer
       */
      function _setHelperLayerPosition(helperLayer) {
        if (helperLayer) {
          //prevent error when `this._currentStep` in undefined
          if (!this._introItems[this._currentStep]) return;

          var currentElement = this._introItems[this._currentStep],
            elementPosition = _getOffset(currentElement.element),
            widthHeightPadding = 10;

          if (currentElement.position === 'floating') {
            widthHeightPadding = 0;
          }

          //set new position to helper layer
          helperLayer.setAttribute('style', 'width: ' + (elementPosition.width + widthHeightPadding) + 'px; ' +
            'height:' + (elementPosition.height + widthHeightPadding) + 'px; ' +
            'top:' + (elementPosition.top - 5) + 'px;' +
            'left: ' + (elementPosition.left - 5) + 'px;');
        }
      }

      /**
       * Show an element on the page
       *
       * @api private
       * @method _showElement
       * @param {Object} targetElement
       */
      function _showElement(targetElement) {

        if (typeof(this._introChangeCallback) !== 'undefined') {
          this._introChangeCallback.call(this, targetElement.element);
        }

        var self = this,
          oldHelperLayer = document.querySelector('.sui-introjs-helperLayer'),
          elementPosition = _getOffset(targetElement.element);

        if (oldHelperLayer !== null) {
          var oldHelperNumberLayer = oldHelperLayer.querySelector('.introjs-helperNumberLayer'),
            oldtooltipLayer = oldHelperLayer.querySelector('.introjs-tooltiptext'),
            oldArrowLayer = oldHelperLayer.querySelector('.introjs-arrow'),
            oldtooltipContainer = oldHelperLayer.querySelector('.introjs-tooltip'),
            skipTooltipButton = oldHelperLayer.querySelector('.introjs-skipbutton'),
            prevTooltipButton = oldHelperLayer.querySelector('.introjs-prevbutton'),
            nextTooltipButton = oldHelperLayer.querySelector('.introjs-nextbutton');

          //hide the tooltip
          oldtooltipContainer.style.opacity = 0;

          if (oldHelperNumberLayer !== null) {
            var lastIntroItem = this._introItems[(targetElement.step - 2 >= 0 ? targetElement.step - 2 : 0)];

            if (lastIntroItem !== null && (this._direction === 'forward' && lastIntroItem.position === 'floating') || (this._direction === 'backward' && targetElement.position === 'floating')) {
              oldHelperNumberLayer.style.opacity = 0;
            }
          }

          //set new position to helper layer
          _setHelperLayerPosition.call(self, oldHelperLayer);

          //remove `introjs-fixParent` class from the elements
          var fixParents = document.querySelectorAll('.introjs-fixParent');
          if (fixParents && fixParents.length > 0) {
            for (var i = fixParents.length - 1; i >= 0; i--) {
              fixParents[i].className = fixParents[i].className.replace(/introjs-fixParent/g, '').replace(/^\s+|\s+$/g, '');
            }
          }

          //remove old classes
          var oldShowElement = document.querySelector('.introjs-showElement');
          oldShowElement.className = oldShowElement.className.replace(/introjs-[a-zA-Z]+/g, '').replace(/^\s+|\s+$/g, '');
          //we should wait until the CSS3 transition is competed (it's 0.3 sec) to prevent incorrect `height` and `width` calculation
          if (self._lastShowElementTimer) {
            clearTimeout(self._lastShowElementTimer);
          }
          self._lastShowElementTimer = setTimeout(function() {
            //set current step to the label
            if (oldHelperNumberLayer !== null) {
              oldHelperNumberLayer.innerHTML = targetElement.step;
            }
            //set current tooltip text
            oldtooltipLayer.innerHTML = targetElement.intro;
            //set the tooltip position
            _placeTooltip.call(self, targetElement.element, oldtooltipContainer, oldArrowLayer, oldHelperNumberLayer);

            //change active bullet
            oldHelperLayer.querySelector('.introjs-bullets li > a.active').className = '';
            oldHelperLayer.querySelector('.introjs-bullets li > a[data-stepnumber="' + targetElement.step + '"]').className = 'active';

            //show the tooltip
            oldtooltipContainer.style.opacity = 1;
            if (oldHelperNumberLayer) oldHelperNumberLayer.style.opacity = 1;
          }, 350);

        } else {
          var helperLayer = document.createElement('div'),
            arrowLayer = document.createElement('div'),
            tooltipLayer = document.createElement('div'),
            tooltipTextLayer = document.createElement('div'),
            bulletsLayer = document.createElement('div'),
            buttonsLayer = document.createElement('div');

          helperLayer.className = 'sui-introjs-helperLayer';

          //set new position to helper layer
          _setHelperLayerPosition.call(self, helperLayer);

          //add helper layer to target element
          this._targetElement.appendChild(helperLayer);

          arrowLayer.className = 'introjs-arrow';

          tooltipTextLayer.className = 'introjs-tooltiptext';
          tooltipTextLayer.innerHTML = targetElement.intro;

          bulletsLayer.className = 'introjs-bullets';

          if (this._options.showBullets === false) {
            bulletsLayer.style.display = 'none';
          }

          var ulContainer = document.createElement('ul');
          var anchorclick = function() {
            self.goToStep(this.getAttribute('data-stepnumber'));
          };

          for (var i = 0, stepsLength = this._introItems.length; i < stepsLength; i++) {
            var innerLi = document.createElement('li');
            var anchorLink = document.createElement('a');

            anchorLink.onclick = anchorclick;

            if (i === 0) anchorLink.className = "active";

            anchorLink.href = 'javascript:void(0);';
            anchorLink.innerHTML = "&nbsp;";
            anchorLink.setAttribute('data-stepnumber', this._introItems[i].step);

            innerLi.appendChild(anchorLink);
            ulContainer.appendChild(innerLi);
          }

          bulletsLayer.appendChild(ulContainer);

          buttonsLayer.className = 'introjs-tooltipbuttons';
          if (this._options.showButtons === false) {
            buttonsLayer.style.display = 'none';
          }

          tooltipLayer.className = 'introjs-tooltip';
          tooltipLayer.appendChild(tooltipTextLayer);
          tooltipLayer.appendChild(bulletsLayer);

          //add helper layer number
          if (this._options.showStepNumbers === true) {
            var helperNumberLayer = document.createElement('span');
            helperNumberLayer.className = 'introjs-helperNumberLayer';
            helperNumberLayer.innerHTML = targetElement.step;
            helperLayer.appendChild(helperNumberLayer);
          }
          tooltipLayer.appendChild(arrowLayer);
          helperLayer.appendChild(tooltipLayer);

          //next button
          var nextTooltipButton = document.createElement('a');

          nextTooltipButton.onclick = function() {
            if (self._introItems.length - 1 !== self._currentStep) {
              _nextStep.call(self);
            }
          };

          nextTooltipButton.href = 'javascript:void(0);';
          nextTooltipButton.innerHTML = this._options.nextLabel;

          //previous button
          var prevTooltipButton = document.createElement('a');

          prevTooltipButton.onclick = function() {
            if (self._currentStep !== 0) {
              _previousStep.call(self);
            }
          };

          prevTooltipButton.href = 'javascript:void(0);';
          prevTooltipButton.innerHTML = this._options.prevLabel;

          //skip button
          var skipTooltipButton = document.createElement('a');
          skipTooltipButton.className = 'sui-btn introjs-skipbutton';
          skipTooltipButton.href = 'javascript:void(0);';
          skipTooltipButton.innerHTML = this._options.skipLabel;

          skipTooltipButton.onclick = function() {
            if (self._introItems.length - 1 === self._currentStep && typeof(self._introCompleteCallback) === 'function') {
              self._introCompleteCallback.call(self);
            }

            if (self._introItems.length - 1 !== self._currentStep && typeof(self._introExitCallback) === 'function') {
              self._introExitCallback.call(self);
            }

            _exitIntro.call(self, self._targetElement);
          };

          buttonsLayer.appendChild(skipTooltipButton);

          //in order to prevent displaying next/previous button always
          if (this._introItems.length > 1) {
            buttonsLayer.appendChild(prevTooltipButton);
            buttonsLayer.appendChild(nextTooltipButton);
          }

          tooltipLayer.appendChild(buttonsLayer);

          //set proper position
          _placeTooltip.call(self, targetElement.element, tooltipLayer, arrowLayer, helperNumberLayer);
        }

        if (this._currentStep === 0 && this._introItems.length > 1) {
          prevTooltipButton.className = 'sui-btn introjs-prevbutton disabled';
          nextTooltipButton.className = 'sui-btn introjs-nextbutton';
          skipTooltipButton.innerHTML = this._options.skipLabel;
        } else if (this._introItems.length - 1 === this._currentStep || this._introItems.length === 1) {
          skipTooltipButton.innerHTML = this._options.doneLabel;
          prevTooltipButton.className = 'sui-btn introjs-prevbutton';
          nextTooltipButton.className = 'sui-btn introjs-nextbutton disabled';
        } else {
          prevTooltipButton.className = 'sui-btn introjs-prevbutton';
          nextTooltipButton.className = 'sui-btn introjs-nextbutton';
          skipTooltipButton.innerHTML = this._options.skipLabel;
        }

        //Set focus on "next" button, so that hitting Enter always moves you onto the next step
        nextTooltipButton.focus();

        //add target element position style
        targetElement.element.className += ' introjs-showElement';

        var currentElementPosition = _getPropValue(targetElement.element, 'position');
        if (currentElementPosition !== 'absolute' &&
          currentElementPosition !== 'relative') {
          //change to new intro item
          targetElement.element.className += ' introjs-relativePosition';
        }

        var parentElm = targetElement.element.parentNode;
        while (parentElm !== null) {
          if (parentElm.tagName.toLowerCase() === 'body') break;

          //fix The Stacking Contenxt problem.
          //More detail: https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Understanding_z_index/The_stacking_context
          var zIndex = _getPropValue(parentElm, 'z-index');
          var opacity = parseFloat(_getPropValue(parentElm, 'opacity'));
          if (/[0-9]+/.test(zIndex) || opacity < 1) {
            parentElm.className += ' introjs-fixParent';
          }

          parentElm = parentElm.parentNode;
        }

        if (!_elementInViewport(targetElement.element) && this._options.scrollToElement === true) {
          var rect = targetElement.element.getBoundingClientRect(),
            winHeight = _getWinSize().height,
            top = rect.bottom - (rect.bottom - rect.top),
            bottom = rect.bottom - winHeight;

          //Scroll up
          if (top < 0 || targetElement.element.clientHeight > winHeight) {
            window.scrollBy(0, top - 30); // 30px padding from edge to look nice

            //Scroll down
          } else {
            window.scrollBy(0, bottom + 100); // 70px + 30px padding from edge to look nice
          }
        }

        if (typeof(this._introAfterChangeCallback) !== 'undefined') {
          this._introAfterChangeCallback.call(this, targetElement.element);
        }
      }

      /**
       * Get an element CSS property on the page
       * Thanks to JavaScript Kit: http://www.javascriptkit.com/dhtmltutors/dhtmlcascade4.shtml
       *
       * @api private
       * @method _getPropValue
       * @param {Object} element
       * @param {String} propName
       * @returns Element's property value
       */
      function _getPropValue(element, propName) {
        var propValue = '';
        if (element.currentStyle) { //IE
          propValue = element.currentStyle[propName];
        } else if (document.defaultView && document.defaultView.getComputedStyle) { //Others
          propValue = document.defaultView.getComputedStyle(element, null).getPropertyValue(propName);
        }

        //Prevent exception in IE
        if (propValue && propValue.toLowerCase) {
          return propValue.toLowerCase();
        } else {
          return propValue;
        }
      }

      /**
       * Provides a cross-browser way to get the screen dimensions
       * via: http://stackoverflow.com/questions/5864467/internet-explorer-innerheight
       *
       * @api private
       * @method _getWinSize
       * @returns {Object} width and height attributes
       */
      function _getWinSize() {
        if (window.innerWidth !== undefined) {
          return { width: window.innerWidth, height: window.innerHeight };
        } else {
          var D = document.documentElement;
          return { width: D.clientWidth, height: D.clientHeight };
        }
      }

      /**
       * Add overlay layer to the page
       * http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
       *
       * @api private
       * @method _elementInViewport
       * @param {Object} el
       */
      function _elementInViewport(el) {
        var rect = el.getBoundingClientRect();

        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          (rect.bottom + 80) <= window.innerHeight && // add 80 to get the text right
          rect.right <= window.innerWidth
        );
      }

      /**
       * Add overlay layer to the page
       *
       * @api private
       * @method _addOverlayLayer
       * @param {Object} targetElm
       */
      function _addOverlayLayer(targetElm) {
        var overlayLayer = document.createElement('div'),
          styleText = '',
          self = this;

        //set css class name
        overlayLayer.className = 'sui-introjs-overlay';

        //check if the target element is body, we should calculate the size of overlay layer in a better way
        if (targetElm.tagName.toLowerCase() === 'body') {
          styleText += 'top: 0;bottom: 0; left: 0;right: 0;position: fixed;';
          overlayLayer.setAttribute('style', styleText);
        } else {
          //set overlay layer position
          var elementPosition = _getOffset(targetElm);
          if (elementPosition) {
            styleText += 'width: ' + elementPosition.width + 'px; height:' + elementPosition.height + 'px; top:' + elementPosition.top + 'px;left: ' + elementPosition.left + 'px;';
            overlayLayer.setAttribute('style', styleText);
          }
        }

        targetElm.appendChild(overlayLayer);

        overlayLayer.onclick = function() {
          if (self._options.exitOnOverlayClick === true) {
            _exitIntro.call(self, targetElm);

            //check if any callback is defined
            if (self._introExitCallback !== undefined) {
              self._introExitCallback.call(self);
            }
          }
        };

        setTimeout(function() {
          styleText += 'opacity: ' + self._options.overlayOpacity.toString() + ';';
          overlayLayer.setAttribute('style', styleText);
        }, 10);

        return true;
      }

      /**
       * Get an element position on the page
       * Thanks to `meouw`: http://stackoverflow.com/a/442474/375966
       *
       * @api private
       * @method _getOffset
       * @param {Object} element
       * @returns Element's position info
       */
      function _getOffset(element) {
        var elementPosition = {};

        //set width
        elementPosition.width = element.offsetWidth;

        //set height
        elementPosition.height = element.offsetHeight;

        //calculate element top and left
        var _x = 0;
        var _y = 0;
        while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
          _x += element.offsetLeft;
          _y += element.offsetTop;
          element = element.offsetParent;
        }
        //set top
        elementPosition.top = _y;
        //set left
        elementPosition.left = _x;

        return elementPosition;
      }

      /**
       * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
       * via: http://stackoverflow.com/questions/171251/how-can-i-merge-properties-of-two-javascript-objects-dynamically
       *
       * @param obj1
       * @param obj2
       * @returns obj3 a new object based on obj1 and obj2
       */
      function _mergeOptions(obj1, obj2) {
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
        return obj3;
      }

      var introJs = function(targetElm, options) {
        if ($.isPlainObject(targetElm) || (!targetElm && !options)) {
          options = targetElm;
          return new IntroJs(document.body, options);
        } else if (targetElm.tagName) {
          //Ok, create a new instance
          return new IntroJs(targetElm, options);

        } else if (typeof(targetElm) === 'string') {
          //select the target element with query selector
          var targetElement = document.querySelector(targetElm);

          if (targetElement) {
            return new IntroJs(targetElement, options);
          } else {
            throw new Error('There is no element with given selector.');
          }
        }
      };

      /**
       * Current IntroJs version
       *
       * @property version
       * @type String
       */
      introJs.version = VERSION;

      //Prototype
      IntroJs.prototype = {
        defaults: {
          /* Next button label in tooltip box */
          nextLabel: '涓嬩竴姝� <i class="sui-icon icon-double-angle-right"></i> ',
          /* Previous button label in tooltip box */
          prevLabel: '<i class="sui-icon icon-double-angle-left"></i> 涓婁竴姝�',
          /* Skip button label in tooltip box */
          skipLabel: '鐭ラ亾浜�',
          /* Done button label in tooltip box */
          doneLabel: '鐭ラ亾浜�',
          /* Default tooltip box position */
          tooltipPosition: 'bottom',
          /* Next CSS class for tooltip boxes */
          tooltipClass: '',
          /* Close introduction when pressing Escape button? */
          exitOnEsc: true,
          /* Close introduction when clicking on overlay layer? */
          exitOnOverlayClick: true,
          /* Show step numbers in introduction? */
          showStepNumbers: true,
          /* Let user use keyboard to navigate the tour? */
          keyboardNavigation: true,
          /* Show tour control buttons? */
          showButtons: true,
          /* Show tour bullets? */
          showBullets: false,
          /* Scroll to highlighted element? */
          scrollToElement: true,
          /* Set the overlay opacity */
          overlayOpacity: 0.8
        },
        clone: function() {
          return new IntroJs(this);
        },
        setOption: function(option, value) {
          this._options[option] = value;
          return this;
        },
        setOptions: function(options) {
          this._options = _mergeOptions(this._options, options);
          return this;
        },
        start: function() {
          _introForElement.call(this, this._targetElement);
          return this;
        },
        goToStep: function(step) {
          _goToStep.call(this, step);
          return this;
        },
        nextStep: function() {
          _nextStep.call(this);
          return this;
        },
        previousStep: function() {
          _previousStep.call(this);
          return this;
        },
        exit: function() {
          _exitIntro.call(this, this._targetElement);
        },
        refresh: function() {
          _setHelperLayerPosition.call(this, document.querySelector('.sui-introjs-helperLayer'));
          return this;
        },
        onbeforechange: function(providedCallback) {
          if (typeof(providedCallback) === 'function') {
            this._introBeforeChangeCallback = providedCallback;
          } else {
            throw new Error('Provided callback for onbeforechange was not a function');
          }
          return this;
        },
        onchange: function(providedCallback) {
          if (typeof(providedCallback) === 'function') {
            this._introChangeCallback = providedCallback;
          } else {
            throw new Error('Provided callback for onchange was not a function.');
          }
          return this;
        },
        onafterchange: function(providedCallback) {
          if (typeof(providedCallback) === 'function') {
            this._introAfterChangeCallback = providedCallback;
          } else {
            throw new Error('Provided callback for onafterchange was not a function');
          }
          return this;
        },
        oncomplete: function(providedCallback) {
          if (typeof(providedCallback) === 'function') {
            this._introCompleteCallback = providedCallback;
          } else {
            throw new Error('Provided callback for oncomplete was not a function.');
          }
          return this;
        },
        onexit: function(providedCallback) {
          if (typeof(providedCallback) === 'function') {
            this._introExitCallback = providedCallback;
          } else {
            throw new Error('Provided callback for onexit was not a function.');
          }
          return this;
        }
      };


      $.introJs = introJs;
    }(jQuery);

  }, {}],
  9: [function(require, module, exports) {
    /* =========================================================
     * bootstrap-modal.js v2.3.2
     * http://getbootstrap.com/2.3.2/javascript.html#modals
     * =========================================================
     * @file bootstrap-modal.js
     * @brief 寮瑰眰dpl锛屾墿灞曡嚜bootstrap2.3.2
     * @author banbian, zangtao.zt@alibaba-inc.com
     * @date 2014-01-14
     */

    ! function($) {
      "use strict";
      /* MODAL CLASS DEFINITION
       * ====================== */
      var Modal = function(element, options) {
        this.options = options
        //鑻lement涓簄ull锛屽垯琛ㄧず涓簀s瑙﹀彂鐨刟lert銆乧onfirm寮瑰眰
        if (element === null) {
          var TPL = ''
            //data-hidetype琛ㄦ槑杩欑被绠€鍗昫ialog璋冪敤hide鏂规硶鏃朵細浠庢枃妗ｆ爲閲屽垹闄よ妭鐐�
            +
            '<div class="sui-modal hide fade" tabindex="-1" role="dialog" id={%id%} data-hidetype="remove">' +
            '<div class="modal-dialog">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            (options.closeBtn ? '<button type="button" class="sui-close" data-dismiss="modal" aria-hidden="true">&times;</button>' : '') +
            '<h4 class="modal-title">{%title%}</h4>' +
            '</div>' +
            '<div class="modal-body ' + (options.hasfoot ? '' : 'no-foot') + '">{%body%}</div>' +
            (options.hasfoot ? '<div class="modal-footer">'
              //澧炲姞data-ok="modal"鍙傛暟
              +
              '<button type="button" class="sui-btn btn-primary btn-large" data-ok="modal">{%ok_btn%}</button>' +
              (options.cancelBtn ? '<button type="button" class="sui-btn btn-default btn-large" data-dismiss="modal">{%cancel_btn%}</button>' : '') +
              '</div>' : '') +
            '</div>' +
            '</div>' +
            '</div>';
          element = $(TPL.replace('{%title%}', options.title)
            .replace('{%body%}', options.body)
            .replace('{%id%}', options.id)
            .replace('{%ok_btn%}', options.okBtn)
            .replace('{%cancel_btn%}', options.cancelBtn))
          //濡傛灉涓嶆敮鎸佸姩鐢绘樉绀猴紙榛樿鏀寔锛�
          $('body').append(element)
        }
        this.$element = $(element)
        if (!options.transition) $(element).removeClass('fade')
        this.init()

      }
      //瀵瑰鎺ュ彛鍙湁toggle, show, hide
      Modal.prototype = {
        constructor: Modal,
        init: function() {
            var ele = this.$element,
              opt = this.options,
              w = opt.width,
              h = opt.height,
              self = this,
              standardW = {
                small: 440 //榛樿瀹藉害
                  ,
                normal: 590,
                large: 780
              }
            ele.delegate('[data-dismiss="modal"]', 'click.dismiss.modal', $.proxy(this.hide, this))
              .delegate(':not(.disabled)[data-ok="modal"]', 'click.ok.modal', $.proxy(this.okHide, this))
            if (w) {
              standardW[w] && (w = standardW[w])
              ele.width(w).css('margin-left', -parseInt(w) / 2)
            }
            h && ele.find('.modal-body').height(h);
            if (typeof this.options.remote == 'string') {
              this.$element.find('.modal-body').load(this.options.remote)
            }
          }

          ,
        toggle: function() {
            return this[!this.isShown ? 'show' : 'hide']()
          }

          ,
        show: function() {
            var self = this,
              e = $.Event('show'),
              ele = this.$element
            ele.trigger(e)
            if (this.isShown || e.isDefaultPrevented()) return
            this.isShown = true
            this.escape()
            this.backdrop(function() {
              var transition = $.support.transition && ele.hasClass('fade')
              if (!ele.parent().length) {
                ele.appendTo(document.body) //don't move modals dom position
              }
              //澶勭悊dialog鍦ㄩ〉闈腑鐨勫畾浣�
              self.resize()

              ele.show()
              if (transition) {
                ele[0].offsetWidth // force reflow
              }
              ele
                .addClass('in')
                .attr('aria-hidden', false)
              self.enforceFocus()
              transition ?
                ele.one($.support.transition.end, function() {
                  callbackAfterTransition(self)
                }) :
                callbackAfterTransition(self)

              function callbackAfterTransition(self) {
                self.$element.focus().trigger('shown')
                if (self.options.timeout > 0) {
                  self.timeid = setTimeout(function() {
                    self.hide();
                  }, self.options.timeout)
                }
              }
            })
            return ele
          }

          ,
        hide: function(e) {
          e && e.preventDefault()
          var $ele = this.$element
          e = $.Event('hide')
          this.hideReason != 'ok' && $ele.trigger('cancelHide')
          $ele.trigger(e)
          if (!this.isShown || e.isDefaultPrevented()) return
          this.isShown = false
          this.escape()
          $(document).off('focusin.modal')
          this.timeid && clearTimeout(this.timeid)
          $ele
            .removeClass('in')
            .attr('aria-hidden', true)
          $.support.transition && $ele.hasClass('fade') ?
            this.hideWithTransition() :
            this.hideModal()
          return $ele
        },
        okHide: function(e) {
            var self = this
            // 濡傛灉e涓簎ndefined鑰屼笉鏄簨浠跺璞★紝鍒欒鏄庝笉鏄偣鍑荤‘瀹氭寜閽Е鍙戠殑鎵ц锛岃€屾槸鎵嬪伐璋冪敤锛�
            // 閭ｄ箞鐩存帴鎵цhideWithOk
            if (!e) {
              hideWithOk()
              return
            }
            var fn = this.options.okHide,
              ifNeedHide = true
            if (!fn) {
              var eventArr = $._data(this.$element[0], 'events').okHide
              if (eventArr && eventArr.length) {
                fn = eventArr[eventArr.length - 1].handler;
              }
            }
            typeof fn == 'function' && (ifNeedHide = fn.call(this))
            //鏄惧紡杩斿洖false锛屽垯涓嶅叧闂璇濇
            if (ifNeedHide !== false) {
              hideWithOk()
            }

            function hideWithOk() {
              self.hideReason = 'ok'
              self.hide(e)
            }
            return self.$element
          }
          //瀵硅瘽妗嗗唴閮ㄩ伄缃╁眰
          ,
        shadeIn: function() {
          var $ele = this.$element
          if ($ele.find('.shade').length) return
          var $shadeEle = $('<div class="shade in" style="background:' + this.options.bgcolor + '"></div>')
          $shadeEle.appendTo($ele)
          this.hasShaded = true
          return this.$element
        },
        shadeOut: function() {
          this.$element.find('.shade').remove()
          this.hasShaded = false
          return this.$element
        },
        shadeToggle: function() {
            return this[!this.hasShaded ? 'shadeIn' : 'shadeOut']()
          }
          // dialog灞曠ず鍚庯紝濡傛灉楂樺害鍔ㄦ€佸彂鐢熷彉鍖栵紝姣斿濉炲叆寮傛鏁版嵁鍚庢拺楂樺鍣紝鍒欒皟鐢�$dialog.modal('resize'),浣縟ialog閲嶆柊瀹氫綅灞呬腑
          ,
        resize: function() {
          var ele = this.$element,
            eleH = ele.height(),
            winH = $(window).height(),
            mt = 0
          if (eleH >= winH)
            mt = -winH / 2
          else
            mt = (winH - eleH) / (1 + 1.618) - winH / 2
          ele.css('margin-top', parseInt(mt))
          return ele
        },
        enforceFocus: function() {
            var self = this
            //闃叉澶氬疄渚嬫椂寰幆瑙﹀彂
            $(document).off('focusin.modal').on('focusin.modal', function(e) {
              if (self.$element[0] !== e.target && !self.$element.has(e.target).length) {
                self.$element.focus()
              }
            })
          }

          ,
        escape: function() {
            var self = this
            if (this.isShown && this.options.keyboard) {
              this.$element.on('keyup.dismiss.modal', function(e) {
                e.which == 27 && self.hide()
              })
            } else if (!this.isShown) {
              this.$element.off('keyup.dismiss.modal')
            }
          }

          ,
        hideWithTransition: function() {
            var self = this,
              timeout = setTimeout(function() {
                self.$element.off($.support.transition.end)
                self.hideModal()
              }, 300)
            this.$element.one($.support.transition.end, function() {
              clearTimeout(timeout)
              self.hideModal()
            })
          }

          ,
        hideModal: function() {
            var self = this,
              ele = this.$element
            ele.hide()
            this.backdrop(function() {
              self.removeBackdrop()
              ele.trigger(self.hideReason == 'ok' ? 'okHidden' : 'cancelHidden')
              self.hideReason = null
              ele.trigger('hidden')
              //閿€姣侀潤鎬佹柟娉曠敓鎴愮殑dialog鍏冪礌 , 榛樿鍙湁闈欐€佹柟娉曟槸remove绫诲瀷
              ele.data('hidetype') == 'remove' && ele.remove()
            })
          }

          ,
        removeBackdrop: function() {
            this.$backdrop && this.$backdrop.remove()
            this.$backdrop = null
          }

          ,
        backdrop: function(callback) {
          var self = this,
            animate = this.$element.hasClass('fade') ? 'fade' : '',
            opt = this.options
          if (this.isShown) {
            var doAnimate = $.support.transition && animate
            //濡傛灉鏄剧ず鑳屾櫙閬僵灞�
            if (opt.backdrop !== false) {
              this.$backdrop = $('<div class="sui-modal-backdrop ' + animate + '" style="background:' + opt.bgcolor + '"/>')
                .appendTo(document.body)
              //閬僵灞傝儗鏅粦鑹插崐閫忔槑
              this.$backdrop.click(
                opt.backdrop == 'static' ?
                $.proxy(this.$element[0].focus, this.$element[0]) :
                $.proxy(this.hide, this)
              )
              if (doAnimate) this.$backdrop[0].offsetWidth // force reflow
              this.$backdrop.addClass('in ')
              if (!callback) return
              doAnimate ?
                this.$backdrop.one($.support.transition.end, callback) :
                callback()
            } else {
              callback && callback()
            }
          } else {
            if (this.$backdrop) {
              this.$backdrop.removeClass('in')
              $.support.transition && this.$element.hasClass('fade') ?
                this.$backdrop.one($.support.transition.end, callback) :
                callback()
            } else {
              callback && callback();
            }
          }
        }
      }

      /* MODAL PLUGIN DEFINITION
       * ======================= */


      var old = $.fn.modal

      $.fn.modal = function(option) {
        //this鎸囧悜dialog鍏冪礌Dom锛�
        //each璁╄濡� $('#qqq, #eee').modal(options) 鐨勭敤娉曞彲琛屻€�
        return this.each(function() {
          var $this = $(this),
            data = $this.data('modal'),
            options = $.extend({}, $.fn.modal.defaults, $this.data(), typeof option == 'object' && option)
          //杩欓噷鍒ゆ柇鐨勭洰鐨勬槸锛氱涓€娆how鏃跺疄渚嬪寲dialog锛屼箣鍚庣殑show鍒欑敤缂撳瓨鍦╠ata-modal閲岀殑瀵硅薄銆�
          if (!data) $this.data('modal', (data = new Modal(this, options)))

          //濡傛灉鏄�$('#xx').modal('toggle'),鍔″繀淇濊瘉浼犲叆鐨勫瓧绗︿覆鏄疢odal绫诲師鍨嬮摼閲屽凡瀛樺湪鐨勬柟娉曘€傚惁鍒欎細鎶ラ敊has no method銆�
          if (typeof option == 'string') data[option]()
          else data.show()
        })
      }

      $.fn.modal.defaults = {
        backdrop: true,
        bgcolor: '#000',
        keyboard: true,
        hasfoot: true,
        closeBtn: true,
        transition: true
      }

      $.fn.modal.Constructor = Modal
      /* MODAL NO CONFLICT
       * ================= */

      $.fn.modal.noConflict = function() {
        $.fn.modal = old
        return this
      }

      /* MODAL DATA-API
       * ============== */

      $(document).on('click.modal.data-api', '[data-toggle="modal"]', function(e) {
        var $this = $(this),
          href = $this.attr('href')
          //$target杩欓噷鎸嘾ialog鏈綋Dom(鑻ュ瓨鍦�)
          //閫氳繃data-target="#foo"鎴杊ref="#foo"鎸囧悜
          ,
          $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) //strip for ie7
          //remote,href灞炴€у鏋滀互#寮€澶达紝琛ㄧず绛夊悓浜巇ata-target灞炴€�
          ,
          option = $target.data('modal') ? 'toggle' : $this.data()
        e.preventDefault()
        $target
          .modal(option)
          .one('hide', function() {
            $this.focus()
          })
      })

      /* jquery寮瑰眰闈欐€佹柟娉曪紝鐢ㄤ簬寰堝皯閲嶅锛屼笉闇€璁颁綇鐘舵€佺殑寮瑰眰锛屽彲鏂逛究鐨勭洿鎺ヨ皟鐢紝鏈€绠€鍗曞舰寮忓氨鏄�$.alert('鎴戞槸alert')
       * 鑻ュ脊灞傚唴瀹规槸澶嶆潅鐨凞om缁撴瀯锛� 寤鸿灏嗗脊灞俬tml缁撴瀯鍐欏埌妯＄増閲岋紝鐢�$(xx).modal(options) 璋冪敤
       *
       * example
       * $.alert({
       *  title: '鑷畾涔夋爣棰�'
       *  body: 'html' //蹇呭～
       *  okBtn : '濂界殑'
       *  cancelBtn : '闆呰揪'
       *  closeBtn: true
       *  keyboard: true   鏄惁鍙敱esc鎸夐敭鍏抽棴
       *  backdrop: true   鍐冲畾鏄惁涓烘ā鎬佸璇濇娣诲姞涓€涓儗鏅伄缃╁眰銆傚彟澶栵紝璇ュ睘鎬ф寚瀹�'static'鏃讹紝琛ㄧず娣诲姞閬僵灞傦紝鍚屾椂鐐瑰嚮妯℃€佸璇濇鐨勫閮ㄥ尯鍩熶笉浼氬皢鍏跺叧闂€�

       *  bgcolor : '#123456'  鑳屾櫙閬僵灞傞鑹�
       *  width: {number|string(px)|'small'|'normal'|'large'}鎺ㄨ崘浼樺厛浣跨敤鍚庝笁涓弿杩版€у瓧绗︿覆锛岀粺涓€鏍峰紡
       *  height: {number|string(px)} 楂樺害
       *  timeout: {number} 1000    鍗曚綅姣ms ,dialog鎵撳紑鍚庡涔呰嚜鍔ㄥ叧闂�
       *  transition: {Boolean} 鏄惁浠ュ姩鐢诲脊鍑哄璇濇锛岄粯璁や负true銆侶TML浣跨敤鏂瑰紡鍙渶鎶婃ā鏉块噷鐨刦ade鐨刢lass鍘绘帀鍗冲彲
       *  hasfoot: {Boolean}  鏄惁鏄剧ず鑴氶儴  榛樿true
       *  remote: {string} 濡傛灉鎻愪緵浜嗚繙绋媢rl鍦板潃锛屽氨浼氬姞杞借繙绔唴瀹�
       *  show:     fn --------------function(e){}
       *  shown:    fn
       *  hide:     fn
       *  hidden:   fn
       *  okHide:   function(e){alert('鐐瑰嚮纭鍚庛€乨ialog娑堝け鍓嶇殑閫昏緫,
       *            鍑芥暟杩斿洖true锛堥粯璁わ級鍒檇ialog鍏抽棴锛屽弽涔嬩笉鍏抽棴;鑻ヤ笉浼犲叆鍒欓粯璁ゆ槸鐩存帴杩斿洖true鐨勫嚱鏁�
       *            娉ㄦ剰涓嶈浜鸿倝杩斿洖undefined锛侊紒')}
       *  okHidden: function(e){alert('鐐瑰嚮纭鍚庛€乨ialog娑堝け鍚庣殑閫昏緫')}
       *  cancelHide: fn
       *  cancelHidden: fn
       * })
       *
       */
      $.extend({
        _modal: function(dialogCfg, customCfg) {
            var modalId = +new Date()

              ,
              finalCfg = $.extend({}, $.fn.modal.defaults, dialogCfg, { id: modalId, okBtn: '纭畾' }, (typeof customCfg == 'string' ? { body: customCfg } : customCfg))
            var dialog = new Modal(null, finalCfg),
              $ele = dialog.$element
            _bind(modalId, finalCfg)
            $ele.data('modal', dialog).modal('show')

            function _bind(id, eList) {
              var eType = ['show', 'shown', 'hide', 'hidden', 'okHidden', 'cancelHide', 'cancelHidden']
              $.each(eType, function(k, v) {
                if (typeof eList[v] == 'function') {
                  $(document).on(v, '#' + id, $.proxy(eList[v], $('#' + id)[0]))
                }
              })
            }
            //闈欐€佹柟娉曞璇濇杩斿洖瀵硅瘽妗嗗厓绱犵殑jQuery瀵硅薄
            return $ele
          }
          //涓烘渶甯歌鐨刟lert锛宑onfirm寤虹珛$.modal鐨勫揩鎹锋柟寮忥紝
          ,
        alert: function(customCfg) {
          var dialogCfg = {
            type: 'alert',
            title: '娉ㄦ剰'
          }
          return $._modal(dialogCfg, customCfg)
        },
        confirm: function(customCfg) {
          var dialogCfg = {
            type: 'confirm',
            title: '鎻愮ず',
            cancelBtn: '鍙栨秷'
          }
          return $._modal(dialogCfg, customCfg)
        }
      })

    }(window.jQuery);

  }, {}],
  10: [function(require, module, exports) {
    //msgs缁勪欢娣诲姞鍙夊弶鍏抽棴鍔熻兘
    ! function($) {
      $(document).on('click.msgs', '[data-dismiss="msgs"]', function(e) {
        e.preventDefault();
        var $this = $(this),
          $msg = $this.parents('.sui-msg').remove();

        var id = $msg.attr("id");
        if (id && $msg.hasClass("remember")) {
          localStorage.setItem("sui-msg-" + id, 1);
        }
      })

      $(function() {
        $(".sui-msg.remember").each(function() {
          var $this = $(this);
          var id = $this.attr("id");
          if (!id) return;
          localStorage.getItem("sui-msg-" + id) || $this.show();
        });
      });
    }(window.jQuery);

  }, {}],
  11: [function(require, module, exports) {
    ! function($) {
      function Pagination(opts) {
        this.itemsCount = opts.itemsCount;
        this.pageSize = opts.pageSize;
        this.displayPage = opts.displayPage < 5 ? 5 : opts.displayPage;
        //itemsCount涓�0鐨勬椂鍊欏簲涓�1椤�
        this.pages = Math.ceil(opts.itemsCount / opts.pageSize) || 1;
        $.isNumeric(opts.pages) && (this.pages = opts.pages);
        this.currentPage = opts.currentPage;
        this.styleClass = opts.styleClass;
        this.onSelect = opts.onSelect;
        this.showCtrl = opts.showCtrl;
        this.remote = opts.remote;
        this.displayInfoType = ((opts.displayInfoType == 'itemsCount' && opts.itemsCount) ? 'itemsCount' : 'pages');
      }

      /* jshint ignore:start */
      Pagination.prototype = {
        //generate the outer wrapper with the config of custom style
        _draw: function() {
          var tpl = '<div class="sui-pagination';
          for (var i = 0; i < this.styleClass.length; i++) {
            tpl += ' ' + this.styleClass[i];
          }
          tpl += '"></div>'
          this.hookNode.html(tpl);
          this._drawInner();
        },
        //generate the true pagination
        _drawInner: function() {
          var outer = this.hookNode.children('.sui-pagination');
          var tpl = '<ul>' + '<li class="prev' + (this.currentPage - 1 <= 0 ? ' disabled' : ' ') + '"><a href="#" data="' + (this.currentPage - 1) + '">芦涓婁竴椤�</a></li>';
          if (this.pages <= this.displayPage || this.pages == this.displayPage + 1) {
            for (var i = 1; i < this.pages + 1; i++) {
              i == this.currentPage ? (tpl += '<li class="active"><a href="#" data="' + i + '">' + i + '</a></li>') : (tpl += '<li><a href="#" data="' + i + '">' + i + '</a></li>');
            }

          } else {
            if (this.currentPage < this.displayPage - 1) {
              for (var i = 1; i < this.displayPage; i++) {
                i == this.currentPage ? (tpl += '<li class="active"><a href="#" data="' + i + '">' + i + '</a></li>') : (tpl += '<li><a href="#" data="' + i + '">' + i + '</a></li>');
              }
              tpl += '<li class="dotted"><span>...</span></li>';
              tpl += '<li><a href="#" data="' + this.pages + '">' + this.pages + '</a></li>';
            } else if (this.currentPage > this.pages - this.displayPage + 2 && this.currentPage <= this.pages) {
              tpl += '<li><a href="#" data="1">1</a></li>';
              tpl += '<li class="dotted"><span>...</span></li>';
              for (var i = this.pages - this.displayPage + 2; i <= this.pages; i++) {
                i == this.currentPage ? (tpl += '<li class="active"><a href="#" data="' + i + '">' + i + '</a></li>') : (tpl += '<li><a href="#" data="' + i + '">' + i + '</a></li>');
              }
            } else {
              tpl += '<li><a href="#" data="1">1</a></li>';
              tpl += '<li class="dotted"><span>...</span></li>';
              var frontPage,
                backPage,
                middle = (this.displayPage - 3) / 2;
              if ((this.displayPage - 3) % 2 == 0) {
                frontPage = backPage = middle;
              } else {
                frontPage = Math.floor(middle);
                backPage = Math.ceil(middle);
              }
              for (var i = this.currentPage - frontPage; i <= this.currentPage + backPage; i++) {
                i == this.currentPage ? (tpl += '<li class="active"><a href="#" data="' + i + '">' + i + '</a></li>') : (tpl += '<li><a href="#" data="' + i + '">' + i + '</a></li>');
              }
              tpl += '<li class="dotted"><span>...</span></li>';
              tpl += '<li><a href="#" data="' + this.pages + '">' + this.pages + '</a></li>';
            }
          }
          tpl += '<li class="next' + (this.currentPage + 1 > this.pages ? ' disabled' : ' ') + '"><a href="#" data="' + (this.currentPage + 1) + '">涓嬩竴椤德�</a></li>' + '</ul>';
          this.showCtrl && (tpl += this._drawCtrl());
          outer.html(tpl);
        },
        //鍊间紶閫�
        _drawCtrl: function() {
          var tpl = '<div>&nbsp;' + (this.displayInfoType == 'itemsCount' ? '<span>鍏�' + this.itemsCount + '鏉�</span>&nbsp;' : '<span>鍏�' + this.pages + '椤�</span>&nbsp;') +
            '<span>' + '&nbsp;鍒�&nbsp;' + '<input type="text" class="page-num"/><button class="page-confirm">纭畾</button>' + '&nbsp;椤�' + '</span>' + '</div>';
          return tpl;
        },

        _ctrl: function() {
          var self = this,
            pag = self.hookNode.children('.sui-pagination');

          function doPagination() {
            var tmpNum = parseInt(pag.find('.page-num').val());
            if ($.isNumeric(tmpNum) && tmpNum <= self.pages && tmpNum > 0) {
              if (!self.remote) {
                self.currentPage = tmpNum;
                self._drawInner();
              }
              if ($.isFunction(self.onSelect)) {
                self.onSelect.call($(this), tmpNum);
              }
            }
          }
          pag.on('click', '.page-confirm', function(e) {
            doPagination.call(this)
          })
          pag.on('keypress', '.page-num', function(e) {
            e.which == 13 && doPagination.call(this)
          })
        },

        _select: function() {
          var self = this;
          self.hookNode.children('.sui-pagination').on('click', 'a', function(e) {
            e.preventDefault();
            var tmpNum = parseInt($(this).attr('data'));
            if (!$(this).parent().hasClass('disabled') && !$(this).parent().hasClass('active')) {
              if (!self.remote) {
                self.currentPage = tmpNum;
                self._drawInner();
              }
              if ($.isFunction(self.onSelect)) {
                self.onSelect.call($(this), tmpNum);
              }
            }
          })
        },

        init: function(opts, hookNode) {
          this.hookNode = hookNode;
          this._draw();
          this._select();
          this.showCtrl && this._ctrl();
          return this;
        },

        updateItemsCount: function(itemsCount, pageToGo) {
          $.isNumeric(itemsCount) && (this.pages = Math.ceil(itemsCount / this.pageSize));
          //濡傛灉鏈€鍚庝竴椤垫病鏈夋暟鎹簡锛岃繑鍥炲埌鍓╀綑鏈€澶ч〉鏁�
          this.currentPage = this.currentPage > this.pages ? this.pages : this.currentPage;
          $.isNumeric(pageToGo) && (this.currentPage = pageToGo);
          this._drawInner();
        },

        updatePages: function(pages, pageToGo) {
          $.isNumeric(pages) && (this.pages = pages);
          this.currentPage = this.currentPage > this.pages ? this.pages : this.currentPage;
          $.isNumeric(pageToGo) && (this.currentPage = pageToGo);
          this._drawInner();
        },

        goToPage: function(page) {
          if ($.isNumeric(page) && page <= this.pages && page > 0) {
            this.currentPage = page;
            this._drawInner()
          }
        }
      }
      /* jshint ignore:end */

      var old = $.fn.pagination;

      $.fn.pagination = function(options) {
        var opts = $.extend({}, $.fn.pagination.defaults, typeof options == 'object' && options);
        if (typeof options == 'string') {
          args = $.makeArray(arguments);
          args.shift();
        }
        var $this = $(this),
          pag = $this.data('sui-pagination');
        if (!pag) $this.data('sui-pagination', (pag = new Pagination(opts).init(opts, $(this))))
        else if (typeof options == 'string') {
          pag[options].apply(pag, args)
        }
        return pag;
      };

      $.fn.pagination.Constructor = Pagination;

      $.fn.pagination.noConflict = function() {
        $.fn.pagination = old;
        return this
      }

      $.fn.pagination.defaults = {
        pageSize: 10,
        displayPage: 5,
        currentPage: 1,
        itemsCount: 0,
        styleClass: [],
        pages: null,
        showCtrl: false,
        onSelect: null,
        remote: false
      }

    }(window.jQuery)

  }, {}],
  12: [function(require, module, exports) {
    //鏍稿績缁勪欢
    require('./transition')
    require('./msgs')
    require('./filesize')
    require('./button')
    require('./dropdown')
    require('./modal')
    require('./tooltip')
    require('./tab')
    require('./pagination')
    require('./validate')
    require('./validate-rules')
    require('./tree')
    require('./datepicker')
    require('./timepicker')
    require('./checkbox')
    require('./autocomplete')
    require('./intro')
    require('./carousel')
    require('./template')

  }, { "./autocomplete": 1, "./button": 2, "./carousel": 3, "./checkbox": 4, "./datepicker": 5, "./dropdown": 6, "./filesize": 7, "./intro": 8, "./modal": 9, "./msgs": 10, "./pagination": 11, "./tab": 13, "./template": 14, "./timepicker": 15, "./tooltip": 16, "./transition": 17, "./tree": 18, "./validate": 20, "./validate-rules": 19 }],
  13: [function(require, module, exports) {
    /* ========================================================
     * bootstrap-tab.js v2.3.2
     * http://getbootstrap.com/2.3.2/javascript.html#tabs
     * ========================================================
     * Copyright 2013 Twitter, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * ======================================================== */


    ! function($) {

      "use strict";


      /* TAB CLASS DEFINITION
       * ==================== */

      var Tab = function(element) {
        this.element = $(element)
      }

      Tab.prototype = {

        constructor: Tab

          ,
        show: function() {
            var $this = this.element,
              $ul = $this.closest('ul:not(.dropdown-menu)'),
              selector = $this.attr('data-target'),
              previous, $target, e

            if (!selector) {
              selector = $this.attr('href')
              selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
            }

            if ($this.parent('li').hasClass('active')) return

            previous = $ul.find('.active:last a')[0]

            e = $.Event('show', {
              relatedTarget: previous
            })

            $this.trigger(e)

            if (e.isDefaultPrevented()) return

            $target = $(selector)

            this.activate($this.parent('li'), $ul)
            this.activate($target, $target.parent(), function() {
              $this.trigger({
                type: 'shown',
                relatedTarget: previous
              })
            })
          }

          ,
        activate: function(element, container, callback) {
          var $active = container.find('> .active'),
            transition = callback &&
            $.support.transition &&
            $active.hasClass('fade')

          function next() {
            $active
              .removeClass('active')
              .find('> .dropdown-menu > .active')
              .removeClass('active')

            element.addClass('active')

            if (transition) {
              element[0].offsetWidth // reflow for transition
              element.addClass('in')
            } else {
              element.removeClass('fade')
            }

            if (element.parent('.dropdown-menu')) {
              element.closest('li.dropdown').addClass('active')
            }

            callback && callback()
          }

          transition ?
            $active.one($.support.transition.end, next) :
            next()

          $active.removeClass('in')
        }
      }


      /* TAB PLUGIN DEFINITION
       * ===================== */

      var old = $.fn.tab

      $.fn.tab = function(option) {
        return this.each(function() {
          var $this = $(this),
            data = $this.data('tab')
          if (!data) $this.data('tab', (data = new Tab(this)))
          if (typeof option == 'string') data[option]()
        })
      }

      $.fn.tab.Constructor = Tab


      /* TAB NO CONFLICT
       * =============== */

      $.fn.tab.noConflict = function() {
        $.fn.tab = old
        return this
      }


      /* TAB DATA-API
       * ============ */

      $(document).on('click.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function(e) {
        e.preventDefault()
        $(this).tab('show')
      })

    }(window.jQuery);

  }, {}],
  14: [function(require, module, exports) {
    /*jshint -W054 */
    // use template in underscore: http://underscorejs.org/
    // By default, Underscore uses ERB-style template delimiters, change the
    // following template settings to use alternative delimiters.
    ! function($) {
      var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;'
      };

      // Functions for escaping and unescaping strings to/from HTML interpolation.
      var createEscaper = function(map) {
        var escaper = function(match) {
          return map[match];
        };
        // Regexes for identifying a key that needs to be escaped
        var keys = [];
        for (var k in escapeMap) keys.push(k);
        var source = '(?:' + keys.join('|') + ')';
        var testRegexp = RegExp(source);
        var replaceRegexp = RegExp(source, 'g');
        return function(string) {
          string = string == null ? '' : '' + string;
          return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
        };
      };
      $.escape = createEscaper(escapeMap);

      var templateSettings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
      };

      // When customizing `templateSettings`, if you don't want to define an
      // interpolation, evaluation or escaping regex, we need one that is
      // guaranteed not to match.
      var noMatch = /(.)^/;

      // Certain characters need to be escaped so that they can be put into a
      // string literal.
      var escapes = {
        "'": "'",
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
      };

      var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

      var escapeChar = function(match) {
        return '\\' + escapes[match];
      };

      // JavaScript micro-templating, similar to John Resig's implementation.
      // Underscore templating handles arbitrary delimiters, preserves whitespace,
      // and correctly escapes quotes within interpolated code.
      // NB: `oldSettings` only exists for backwards compatibility.
      $.template = function(text, settings, oldSettings) {
        if (!settings && oldSettings) settings = oldSettings;
        settings = $.extend({}, settings, templateSettings);

        // Combine delimiters into one regular expression via alternation.
        var matcher = RegExp([
          (settings.escape || noMatch).source,
          (settings.interpolate || noMatch).source,
          (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');

        // Compile the template source, escaping string literals appropriately.
        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
          source += text.slice(index, offset).replace(escaper, escapeChar);
          index = offset + match.length;

          if (escape) {
            source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
          } else if (interpolate) {
            source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
          } else if (evaluate) {
            source += "';\n" + evaluate + "\n__p+='";
          }

          // Adobe VMs need the match returned to produce the correct offest.
          return match;
        });
        source += "';\n";

        // If a variable is not specified, place data values in local scope.
        if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

        source = "var __t,__p='',__j=Array.prototype.join," +
          "print=function(){__p+=__j.call(arguments,'');};\n" +
          source + 'return __p;\n';

        try {
          var render = new Function(settings.variable || 'obj', '_', source);
        } catch (e) {
          e.source = source;
          throw e;
        }

        var template = function(data) {
          return render.call(this, data, $);
        };

        // Provide the compiled source as a convenience for precompilation.
        var argument = settings.variable || 'obj';
        template.source = 'function(' + argument + '){\n' + source + '}';

        return template;
      };
    }(window.jQuery);

  }, {}],
  15: [function(require, module, exports) {
    /*jshint sub:true*/
    ! function($) {
      function TimePicker(element, cfg) {
        if (!(this instanceof TimePicker)) {
          return new TimePicker(element, cfg);
        }

        this.init(element, cfg);
      }

      TimePicker.prototype = {

        _defaultCfg: {
          hour: (new Date()).getHours(),
          minute: (new Date()).getMinutes(),
          orientation: { x: 'auto', y: 'auto' },
          keyboardNavigation: true
        },

        init: function(element, cfg) {

          this.element = $(element)
          this.isInline = false;
          this.isInDatepicker = false;
          this.isInput = this.element.is('input');

          this.component = this.element.is('.date') ? this.element.find('.add-on, .input-group-addon, .sui-btn') : false;
          this.hasInput = this.component && this.element.find('input').length;
          if (this.component && this.component.length === 0)
            this.component = false;


          this.picker = $('<div class="timepicker"></div>');


          this.o = this.config = $.extend(this._defaultCfg, cfg);

          this._buildEvents();
          this._attachEvents();

          if (this.isInDatepicker) {
            this.picker.addClass('timepicker-in-datepicker').appendTo(this.element);
          } else if (this.isInline) {
            this.picker.addClass('timepicker-inline').appendTo(this.element);
            this._show();
          } else {
            this.picker.addClass('timepicker-dropdown dropdown-menu');
          }
        },

        destory: function() {
          this._detachSecondaryEvents();
          this.picker.html('');
          this.picker = null;
        },

        _show: function() {
          if (!this.isInline && !this.isInDatepicker)
            this.picker.appendTo('body');
          this.picker.show();
          this._place();
          this._render();
          this._attachSecondaryEvents();
        },
        show: function() {
          return this._show();
        },
        _hide: function() {
          if (this.isInline || this.isInDatepicker)
            return;
          if (!this.picker.is(':visible'))
            return;
          this.focusDate = null;
          this.picker.hide().detach();
          this._detachSecondaryEvents();
          this._setValue();
        },

        _keydown: function(e) {
          if (this.isInDatepicker) return;
          if (this.picker.is(':not(:visible)')) {
            if (e.keyCode === 27) // allow escape to hide and re-show picker
              this._show();
            return;
          }
          var dir, rol;
          switch (e.keyCode) {
            case 27: // escape
              this._hide();
              e.preventDefault();
              break;
            case 37: // left
            case 39: // right
              if (!this.o.keyboardNavigation)
                break; //鍜宨nput 杈撳叆鏈夊啿绐� 娉ㄩ噴鎺�
              // dir = e.keyCode === 37 ? 'up' : 'down';
              // rol = 'hour';
              // this._slide(rol,dir);
              break;
            case 38: // up
            case 40: // down
              if (!this.o.keyboardNavigation)
                break;
              // dir = e.keyCode === 38 ? 'up' : 'down';
              // rol = 'minute';
              // this._slide(rol,dir);
              break;
            case 32: // spacebar
              // Spacebar is used in manually typing dates in some formats.
              // As such, its behavior should not be hijacked.
              break;
            case 13: // enter
              this._hide();
              break;
          }
        },

        _place: function() {
          if (this.isInline || this.isInDatepicker)
            return;
          var calendarWidth = this.picker.outerWidth(),
            calendarHeight = this.picker.outerHeight(),
            visualPadding = 10,
            $window = $(window),
            windowWidth = $window.width(),
            windowHeight = $window.height(),
            scrollTop = $window.scrollTop();

          var zIndex = parseInt(this.element.parents().filter(function() {
            return $(this).css('z-index') !== 'auto';
          }).first().css('z-index')) + 10;
          var offset = this.component ? this.component.parent().offset() : this.element.offset();
          var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
          var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
          var left = offset.left,
            top = offset.top;

          this.picker.removeClass(
            'datepicker-orient-top datepicker-orient-bottom ' +
            'datepicker-orient-right datepicker-orient-left'
          );

          if (this.o.orientation.x !== 'auto') {
            this.picker.addClass('datepicker-orient-' + this.o.orientation.x);
            if (this.o.orientation.x === 'right')
              left -= calendarWidth - width;
          }
          // auto x orientation is best-placement: if it crosses a window
          // edge, fudge it sideways
          else {
            // Default to left
            this.picker.addClass('datepicker-orient-left');
            if (offset.left < 0)
              left -= offset.left - visualPadding;
            else if (offset.left + calendarWidth > windowWidth)
              left = windowWidth - calendarWidth - visualPadding;
          }

          // auto y orientation is best-situation: top or bottom, no fudging,
          // decision based on which shows more of the calendar
          var yorient = this.o.orientation.y,
            top_overflow, bottom_overflow;
          if (yorient === 'auto') {
            top_overflow = -scrollTop + offset.top - calendarHeight;
            bottom_overflow = scrollTop + windowHeight - (offset.top + height + calendarHeight);
            if (Math.max(top_overflow, bottom_overflow) === bottom_overflow)
              yorient = 'top';
            else
              yorient = 'bottom';
          }
          this.picker.addClass('datepicker-orient-' + yorient);
          if (yorient === 'top')
            top += height + 6;
          else
            top -= calendarHeight + parseInt(this.picker.css('padding-top')) + 6;

          this.picker.css({
            top: top,
            left: left,
            zIndex: zIndex
          });
        },

        // envent method
        _events: [],
        _secondaryEvents: [],
        _applyEvents: function(evs) {
          for (var i = 0, el, ch, ev; i < evs.length; i++) {
            el = evs[i][0];
            if (evs[i].length === 2) {
              ch = undefined;
              ev = evs[i][1];
            } else if (evs[i].length === 3) {
              ch = evs[i][1];
              ev = evs[i][2];
            }
            el.on(ev, ch);
          }
        },
        _unapplyEvents: function(evs) {
          for (var i = 0, el, ev, ch; i < evs.length; i++) {
            el = evs[i][0];
            if (evs[i].length === 2) {
              ch = undefined;
              ev = evs[i][1];
            } else if (evs[i].length === 3) {
              ch = evs[i][1];
              ev = evs[i][2];
            }
            el.off(ev, ch);
          }
        },

        _attachEvents: function() {
          this._detachEvents();
          this._applyEvents(this._events);
        },
        _detachEvents: function() {
          this._unapplyEvents(this._events);
        },
        _attachSecondaryEvents: function() {
          this._detachSecondaryEvents();
          this._applyEvents(this._secondaryEvents);
          this._pickerEvents();
        },
        _detachSecondaryEvents: function() {
          this._unapplyEvents(this._secondaryEvents);
          this.picker.off('click');
        },

        _buildEvents: function() {
          if (this.isInput) { // single input
            this._events = [
              [this.element, {
                focus: $.proxy(this._show, this),
                keyup: $.proxy(function(e) {
                  if ($.inArray(e.keyCode, [27, 37, 39, 38, 40, 32, 13, 9]) === -1)
                    this._updateUI();
                }, this),
                keydown: $.proxy(this._keydown, this)
              }]
            ];
          } else if (this.component && this.hasInput) { // component: input + button
            this._events = [
              // For components that are not readonly, allow keyboard nav
              [this.element.find('input'), {
                focus: $.proxy(this._show, this),
                keyup: $.proxy(function(e) {
                  if ($.inArray(e.keyCode, [27, 37, 39, 38, 40, 32, 13, 9]) === -1)
                    this._updateUI();
                }, this),
                keydown: $.proxy(this._keydown, this)
              }],
              [this.component, {
                click: $.proxy(this._show, this)
              }]
            ];
          } else if (this.element.is('div')) { // inline timepicker
            if (this.element.is('.timepicker-container')) {
              this.isInDatepicker = true;
            } else {
              this.isInline = true;
            }
          } else {
            this._events = [
              [this.element, {
                click: $.proxy(this._show, this)
              }]
            ];
          }
          this._events.push(
            // Component: listen for blur on element descendants
            [this.element, '*', {
              blur: $.proxy(function(e) {
                this._focused_from = e.target;
              }, this)
            }],
            // Input: listen for blur on element
            [this.element, {
              blur: $.proxy(function(e) {
                this._focused_from = e.target;
              }, this)
            }]
          );

          this._secondaryEvents = [
            [$(window), {
              resize: $.proxy(this._place, this)
            }],
            [$(document), {
              'mousedown touchstart': $.proxy(function(e) {
                // Clicked outside the datepicker, hide it
                if (!(
                    this.element.is(e.target) ||
                    this.element.find(e.target).length ||
                    this.picker.is(e.target) ||
                    this.picker.find(e.target).length
                  )) {
                  this._hide();
                }
              }, this)
            }]
          ];
        },

        _pickerEvents: function() {

          var self = this;

          this.picker.on('click', '.J_up', function(ev) {

            var target = ev.currentTarget,
              parentNode = $(target).parent(),
              role = parentNode.attr('data-role');

            self._slide(role, 'up');

          }).on('click', '.J_down', function(ev) {
            var target = ev.currentTarget,
              parentNode = $(target).parent(),
              role = parentNode.attr('data-role');

            self._slide(role, 'down');

          }).on('click', 'span', function(ev) {

            var target = ev.currentTarget,
              parentNode = $(target).parent().parent().parent(),
              role = parentNode.attr('data-role'),
              targetNum = target.innerHTML,
              attrs = self[role + 'Attr'],
              step = parseInt(targetNum - attrs.current, 10),
              dur;
            if (step > 0) {
              self._slideDonw(attrs, step);
            } else {
              self._slideUp(attrs, -step);
            }

          });
        },

        _slide: function(role, direction) {

          var attrs = this[role + 'Attr'];

          if (direction == 'up') {
            this._slideUp(attrs);
          } else if (direction == 'down') {
            this._slideDonw(attrs);
          }
        },

        _slideDonw: function(attrs, step, notSetValue) {

          step = step || 1;
          var cp = attrs.cp,
            dur = attrs.ih * step;

          attrs.current += step;

          if (attrs.current > attrs.maxSize) {
            attrs.current = 0;
            dur = -attrs.ih * attrs.maxSize;
          }

          attrs.cp -= dur;
          this._animate(attrs.innerPickerCon, attrs.cp);

          $('.current', attrs.innerPickerCon).removeClass('current');
          $('span[data-num="' + attrs.current + '"]', attrs.innerPickerCon).addClass('current');
          if (!notSetValue) {
            this._setValue();
          }
        },

        _slideUp: function(attrs, step, notSetValue) {

          step = step || 1;

          var cp = attrs.cp,
            dur = attrs.ih * step;

          attrs.current -= step;

          if (attrs.current < 0) {
            attrs.current = attrs.maxSize;
            dur = -attrs.ih * attrs.maxSize;
          }

          attrs.cp += dur;
          this._animate(attrs.innerPickerCon, attrs.cp);
          $('.current', attrs.innerPickerCon).removeClass('current');
          $('span[data-num="' + attrs.current + '"]', attrs.innerPickerCon).addClass('current');
          if (!notSetValue) {
            this._setValue();
          }
        },
        _updateSlide: function(attrs, step) {
          var notSetValue = true;
          if (step && (step > 0)) {
            this._slideDonw(attrs, step, notSetValue);
          } else if (step) {
            this._slideUp(attrs, -step, notSetValue);
          }
        },
        _updateUI: function() {
          var oldMimute = this.o.minute,
            oldHour = this.o.hour,
            attrs, role, step;

          this._getInputTime();


          if (oldMimute !== this.o.minute) {
            attrs = this['minuteAttr'];
            step = parseInt(this.o.minute - attrs.current, 10);
            this._updateSlide(attrs, step);
          }
          if (oldHour !== this.o.hour) {
            attrs = this['hourAttr'];
            step = parseInt(this.o.hour - attrs.current, 10);
            this._updateSlide(attrs, step);
          }
        },

        //灏嗘椂闂磋缃湪input 鎴栬€� data-api閲�
        _doSetValue: function(timeStr, notSetValue) {
          var element;
          if (this.isInput) {
            element = this.element;
          } else if (this.component) {
            element = this.element.find('input');
          }
          if (element) {
            element.change();
            element.val(timeStr);
          } else if (this.isInDatepicker) {
            this.element.data("time", timeStr);
            if (!notSetValue) {
              this.element.trigger('time:change');
            }
          }
        },
        _render: function() {
          this.picker.html('');
          this._getInputTime();
          this._renderHour();
          this._renderMinutes();
          this._renderSplit();
          //form input
          this._setValue();
        },
        _foramtTimeString: function(val) {
          var time = {
              minute: 0,
              hour: 0
            },
            minute, hour;
          val = val.split(':');
          for (var i = val.length - 1; i >= 0; i--) {
            val[i] = $.trim(val[i]);
          }
          if (val.length === 2) {
            minute = parseInt(val[1], 10);
            if (minute >= 0 && minute < 60) {
              time.minute = minute;
            }
            hour = parseInt(val[0], 10);
            if (hour >= 0 && hour < 24) {
              time.hour = hour;
            }
          }
          return time;
        },
        _getInputTime: function() {
          if (this.isInline && this.isInDatepicker) return;
          var element, minute, hour, val, time;
          if (this.isInput || this.isInDatepicker) {
            element = this.element;
          } else if (this.component) {
            element = this.element.find('input');
          }
          if (element) {
            if (this.isInDatepicker) {
              val = $.trim(element.data('time'));
            } else {
              val = $.trim(element.val());
            }
            time = this._foramtTimeString(val)
            this.o.minute = time.minute;
            this.o.hour = time.hour;
          }
        },

        _juicer: function(current, list) {
          var items = '',
            item;
          for (var i = list.length - 1; i >= 0; i--) {
            if (list[i] == current) {
              item = '<span ' + 'class="current" data-num="' + i + '">' + list[i] + '</span>';
            } else {
              item = '<span ' + 'data-num="' + i + '">' + list[i] + '</span>';
            }
            items = item + items;
          }
          return '<div class="picker-wrap">' +
            '<a href="javascript:;" class="picker-btn up J_up"><b class="arrow"></b><b class="arrow-bg"></b></a>' +
            '<div class="picker-con">' +
            '<div class="picker-innercon">' +
            items +
            '</div>' +
            '</div>' +
            '<a href="javascript:;" class="picker-btn down J_down"><b class="arrow"></b><b class="arrow-bg"></b></a>' +
            '</div>';
        },

        _renderHour: function() {
          var self = this,
            hourRet = [];

          for (var i = 0; i < 24; i++) {
            hourRet.push(self._beautifyNum(i));
          }

          var tpl = this._juicer(self.o.hour, hourRet),
            $tpl = $(tpl);

          $tpl.attr('data-role', 'hour');

          this.picker.append($tpl);

          this.hourAttr = this._addPrefixAndSuffix($tpl, 23);
          this.hourAttr.current = this.o.hour;
          this.hourAttr.maxSize = 23;
        },

        _renderMinutes: function() {
          var self = this,
            minuteRet = [];
          for (var i = 0; i < 60; i++) {
            minuteRet.push(self._beautifyNum(i));
          }

          var tpl = this._juicer(self.o.minute, minuteRet),
            $tpl = $(tpl);

          $tpl.attr('data-role', 'minute');

          this.picker.append($tpl);

          this.minuteAttr = this._addPrefixAndSuffix($tpl, 59);
          this.minuteAttr.current = this.o.minute;
          this.minuteAttr.maxSize = 59;
        },

        _addPrefixAndSuffix: function(parentNode, maxSize) {

          var self = this,
            pickerCon = $('.picker-con', parentNode),
            innerPickerCon = $('.picker-innercon', parentNode),
            currentNode = $('.current', parentNode),
            itemH = currentNode.outerHeight(),
            parentH = pickerCon.outerHeight(),
            fixNum = Math.floor(parentH / itemH) + 1,
            currentNodeOffsetTop,
            currentPosition,
            tpl = '';

          for (var j = maxSize - fixNum; j <= maxSize; j++) {
            tpl += '<span>' + self._beautifyNum(j) + '</span>';
          }

          innerPickerCon.prepend($(tpl));

          tpl = '';

          for (var i = 0; i < fixNum; i++) {
            tpl += '<span>' + self._beautifyNum(i) + '</span>';
          }

          innerPickerCon.append($(tpl));

          currentNodeOffsetTop = currentNode.offset().top - pickerCon.offset().top;
          currentPosition = -currentNodeOffsetTop + itemH * 2;
          this._animate(innerPickerCon, currentPosition);

          return {
            ph: parentH,
            cp: currentPosition,
            ih: itemH,
            innerPickerCon: innerPickerCon,
            scrollNum: fixNum - 1
          };
        },

        _renderSplit: function() {
          var tpl = '<div class="timePicker-split">' +
            '<div class="hour-input"></div>' +
            '<div class="split-icon">:</div>' +
            '<div class="minute-input"></div>' +
            '</div>';

          this.picker.append($(tpl));
        },
        _getCurrentTimeStr: function() {
          var text, minute, hour;
          hour = this.hourAttr.current;
          minute = this.minuteAttr.current;
          text = this._beautifyNum(hour) + ':' + this._beautifyNum(minute);
          return text;
        },
        _setValue: function() {
          if (this.isInline) return;
          this._doSetValue(this._getCurrentTimeStr()); //灏嗘椂闂磋濉湪 input 鎴栬€� data api 閲�
        },

        _animate: function(node, dur) {

          if ($.support.transition) {
            node.css({
              'top': dur + 'px',
            });
          } else {
            node.animate({
              top: dur + 'px',
            }, 300);
          }

        },

        _beautifyNum: function(num) {
          num = num.toString();
          if (parseInt(num) < 10) {
            return '0' + num;
          }

          return num;
        },
        //閫氳繃鍙傛暟鏉ユ洿鏂版棩鏈�
        //timeStr(string): 12:20
        //notSetValue(string): false/true , 鏄惁闇€瑕佸皢鏁板€艰缃湪input涓�. true 鐨勬椂鍊欏彧鑳借缃湪data-api涓�,杩欎釜鍙傛暟鍙敤鍦╠atepicker涓�
        update: function(timeStr, notSetValue) {
          this._doSetValue(timeStr, notSetValue);
          this._updateUI();
        },

        getTime: function() {
          return this._getCurrentTimeStr();
        }
      }

      /* DROPDOWN PLUGIN DEFINITION
       * ========================== */
      //maincode end
      var old = $.fn.timepicker;
      $.fn.timepicker = function(option) {
        var args = Array.apply(null, arguments);
        args.shift();
        var internal_return;
        this.each(function() {
          var $this = $(this),
            data = $this.data('timepicker')
          if (!data) $this.data('timepicker', (data = new TimePicker(this, option)))
          if (typeof option === 'string' && typeof data[option] === 'function') {
            internal_return = data[option].apply(data, args);
            if (internal_return !== undefined)
              return false;
          }
        });
        if (internal_return !== undefined)
          return internal_return;
        else
          return this;
      }
      /* TIMEPICKER NO CONFLICT
       * =================== */

      $.fn.timepicker.noConflict = function() {
        $.fn.timepicker = old;
        return this;
      };


      /* TIMEPICKER DATA-API
       * ================== */

      $(document).on(
        'focus.timepicker.data-api click.timepicker.data-api',
        '[data-toggle="timepicker"]',
        function(e) {
          var $this = $(this);
          if ($this.data('timepicker'))
            return;
          e.preventDefault();
          // component click requires us to explicitly show it
          $this.timepicker('_show');
        }
      );
      $(function() {
        $('[data-toggle="timepicker-inline"]').timepicker();
      });
    }(window.jQuery)

  }, {}],
  16: [function(require, module, exports) {
    /* ===========================================================
     * bootstrap-tooltip.js v2.3.2
     * http://getbootstrap.com/2.3.2/javascript.html#tooltips
     * Inspired by the original jQuery.tipsy by Jason Frame
     * ===========================================================
     * Copyright 2013 Twitter, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * ========================================================== */


    ! function($) {

      "use strict";


      /* TOOLTIP PUBLIC CLASS DEFINITION
       * =============================== */

      //element涓鸿Е鍙戝厓绱狅紝濡傛爣璇嗘枃瀛楅摼
      var Tooltip = function(element, options) {
        this.init('tooltip', element, options)
      }

      Tooltip.prototype = {

        constructor: Tooltip

          ,
        init: function(type, element, options) {
            var eventIn, eventOut, triggers, trigger, i

            this.type = type
            this.$element = $(element)
            this.options = this.getOptions(options)
            this.enabled = true
            this.hoverState = 'out'

            triggers = this.options.trigger.split(' ')

            for (i = triggers.length; i--;) {
              trigger = triggers[i]
              if (trigger == 'click') {
                this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))

              } else if (trigger != 'manual') {
                eventIn = trigger == 'hover' ? 'mouseenter' : 'focus'
                eventOut = trigger == 'hover' ? 'mouseleave' : 'blur'
                this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
                this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
              }
            }

            this.options.selector ?
              (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
              this.fixTitle()
          }

          ,
        getOptions: function(options) {
            options = $.extend({}, $.fn[this.type].defaults, this.$element.data(), options)

            var foot = options.type == 'confirm' ? '<div class="tooltip-footer"><button class="sui-btn btn-primary" data-ok="tooltip">纭畾</button><button class="sui-btn btn-default" data-dismiss="tooltip">鍙栨秷</button></div>' : ''
            //鏍规嵁tooltip鐨則ype绫诲瀷鏋勯€爐ip妯＄増
            options.template = '<div class="sui-tooltip ' + options.type + '" style="overflow:visible"><div class="tooltip-arrow"><div class="tooltip-arrow cover"></div></div><div class="tooltip-inner"></div>' + foot + '</div>'
            options.type == 'confirm' && (options.html = true)

            if (options.delay && typeof options.delay == 'number') {
              options.delay = {
                show: options.delay,
                hide: options.delay
              }
            }

            return options
          }

          ,
        enter: function(e) {
            var defaults = $.fn[this.type].defaults,
              options = {},
              self

            this._options && $.each(this._options, function(key, value) {
              if (defaults[key] != value) options[key] = value
            }, this)

            self = $(e.currentTarget)[this.type](options).data(this.type)

            clearTimeout(self.timeout)
            if (this.hoverState == 'out') {
              this.hoverState = 'in'
              this.tip().off($.support.transition && $.support.transition.end)
              if (!this.options.delay || !this.options.delay.show) return this.show()
              this.timeout = setTimeout(function() {
                if (self.hoverState == 'in') self.show()
              }, self.options.delay.show)
            }
          }

          ,
        leave: function(e) {
            var self = $(e.currentTarget)[this.type](this._options).data(this.type)
            if (this.timeout) clearTimeout(this.timeout)
            if (!self.options.delay || !self.options.delay.hide) return self.hide()

            this.timeout = setTimeout(function() {
              //isHover 涓�0鎴杣ndefined锛寀ndefined:娌℃湁绉诲埌tip涓婅繃
              if (!self.isTipHover) {
                self.hoverState = 'out'
              }
              if (self.hoverState == 'out') self.hide()
            }, self.options.delay.hide)
          }

          ,
        show: function() {
            var $tip, pos, actualWidth, actualHeight, placement, tp, e = $.Event('show'),
              opt = this.options,
              align = opt.align,
              self = this

            if (this.hasContent() && this.enabled) {
              this.$element.trigger(e)
              if (e.isDefaultPrevented()) return
              $tip = this.tip()
              this.setContent()

              if (opt.animation) {
                $tip.addClass('fade')
              }

              placement = typeof opt.placement == 'function' ?
                opt.placement.call(this, $tip[0], this.$element[0]) :
                opt.placement

              $tip
                .detach()
                .css({ top: 0, left: 0, display: 'block' })

              opt.container ? $tip.appendTo(opt.container) : $tip.insertAfter(this.$element)
              if (/\bhover\b/.test(opt.trigger)) {
                $tip.hover(function() {
                  self.isTipHover = 1
                }, function() {
                  self.isTipHover = 0
                  self.hoverState = 'out'
                  $tip.detach()
                })
              }
              this.setWidth()
              pos = this.getPosition()

              actualWidth = $tip[0].offsetWidth
              actualHeight = $tip[0].offsetHeight

              //+ - 7淇锛屽拰css瀵瑰簲锛屽嬁鍗曠嫭淇敼
              var d = opt.type == 'attention' ? 5 : 7
              tp = positioning();
              this.applyPlacement(tp, placement)
              this.applyAlign(align, pos)
              this.$element.trigger('shown')
            }
            //纭畾tooltip甯冨眬瀵归綈鏂瑰紡
            function positioning() {
              var _left = pos.left + pos.width / 2 - actualWidth / 2,
                _top = pos.top + pos.height / 2 - actualHeight / 2
              switch (align) {
                case 'left':
                  _left = pos.left
                  break
                case 'right':
                  _left = pos.left - actualWidth + pos.width
                  break
                case 'top':
                  _top = pos.top
                  break
                case 'bottom':
                  _top = pos.top - actualHeight + pos.height
                  break
              }
              switch (placement) {
                case 'bottom':
                  tp = { top: pos.top + pos.height + d, left: _left }
                  break
                case 'top':
                  tp = { top: pos.top - actualHeight - d, left: _left }
                  break
                case 'left':
                  tp = { top: _top, left: pos.left - actualWidth - d }
                  break
                case 'right':
                  tp = { top: _top, left: pos.left + pos.width + d }
                  break
              }
              return tp
            }

          }

          ,
        applyPlacement: function(offset, placement) {
          var $tip = this.tip(),
            width = $tip[0].offsetWidth,
            height = $tip[0].offsetHeight,
            actualWidth, actualHeight, delta, replace

          $tip
            .offset(offset)
            .addClass(placement)
            .addClass('in')

          actualWidth = $tip[0].offsetWidth
          actualHeight = $tip[0].offsetHeight

          if (placement == 'top' && actualHeight != height) {
            offset.top = offset.top + height - actualHeight
            replace = true
          }

          if (placement == 'bottom' || placement == 'top') {
            delta = 0

            if (offset.left < 0) {
              delta = offset.left * -2
              offset.left = 0
              $tip.offset(offset)
              actualWidth = $tip[0].offsetWidth
              actualHeight = $tip[0].offsetHeight
            }

            this.replaceArrow(delta - width + actualWidth, actualWidth, 'left')
          } else {
            this.replaceArrow(actualHeight - height, actualHeight, 'top')
          }

          if (replace) $tip.offset(offset)
        },
        applyAlign: function(align, tipPos) {
            var $tip = this.tip(),
              actualWidth = $tip[0].offsetWidth,
              actualHeight = $tip[0].offsetHeight,
              css = {}
            switch (align) {
              case 'left':
                if (tipPos.width < actualWidth)
                  css = { left: tipPos.width / 2 }
                break
              case 'right':
                if (tipPos.width < actualWidth)
                  css = { left: actualWidth - tipPos.width / 2 }
                break
              case 'top':
                if (tipPos.height < actualHeight)
                  css = { top: tipPos.height / 2 }
                break
              case 'bottom':
                if (tipPos.height < actualHeight)
                  css = { top: actualHeight - tipPos.height / 2 }
                break
            }
            align != 'center' && $tip.find('.tooltip-arrow').first().css(css)

          }

          ,
        replaceArrow: function(delta, dimension, position) {
            this
              .arrow()
              .css(position, delta ? (50 * (1 - delta / dimension) + "%") : '')
          }

          ,
        setWidth: function() {
            var opt = this.options,
              width = opt.width,
              widthLimit = opt.widthlimit,
              $tip = this.tip()
            //浜哄伐璁剧疆瀹藉害锛屽垯蹇界暐鏈€澶у搴﹂檺鍒�
            if (width) {
              $tip.width(width)
            } else {
              //瀹藉害闄愬埗閫昏緫
              if (widthLimit === true) {
                $tip.css('max-width', '400px')
              } else {
                var val
                widthLimit === false && (val = 'none')
                typeof opt.widthlimit == 'string' && (val = widthLimit)
                $tip.css('max-width', val)
              }
            }
          }

          ,
        setContent: function() {
            var $tip = this.tip(),
              title = this.getTitle()

            $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
            $tip.removeClass('fade in top bottom left right')
          }

          ,
        hide: function() {
            var $tip = this.tip(),
              e = $.Event('hide'),
              self = this,
              opt = this.options

            this.$element.trigger(e)
            if (e.isDefaultPrevented()) return

            $tip.removeClass('in')
            if (typeof opt.hide == 'function') {
              opt.hide.call(self.$element)
            }

            function removeWithAnimation() {
              self.timeout = setTimeout(function() {
                $tip.off($.support.transition.end).detach()
              }, 500)

              $tip.one($.support.transition.end, function() {
                clearTimeout(self.timeout)
                $tip.detach()
              })
            }

            $.support.transition && this.$tip.hasClass('fade') ?
              removeWithAnimation() :
              ($tip.detach())
            this.$element.trigger('hidden')

            return this
          }

          ,
        fixTitle: function() {
            var $e = this.$element
            //鍙湁鏃爅s婵€娲绘柟寮忔墠澶勭悊title灞炴€с€傚悓鏃秇tml灞炴€ata-original-title蹇呴』闄勫姞鍒拌Е鍙戝厓绱�,鍗充娇鏄痡s璋冪敤鐢熸垚鐨則ooltip銆�
            if ($e.attr('title') || typeof($e.attr('data-original-title')) != 'string') {
              if ($e.data('toggle') == 'tooltip') {
                $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
              } else {
                $e.attr('data-original-title', '')
              }
            }
          }

          ,
        hasContent: function() {
            return this.getTitle()
          }

          ,
        getPosition: function() {
            var el = this.$element[0]
            return $.extend({}, (typeof el.getBoundingClientRect == 'function') ? el.getBoundingClientRect() : {
              width: el.offsetWidth,
              height: el.offsetHeight
            }, this.$element.offset())
          }

          ,
        getTitle: function() {
            var title, $e = this.$element,
              o = this.options

            title = $e.attr('data-original-title') ||
              (typeof o.title == 'function' ? o.title.call($e[0]) : o.title)
            return title
          }

          ,
        tip: function() {
            return this.$tip = this.$tip || $(this.options.template)
          }

          ,
        arrow: function() {
            return this.$arrow = this.$arrow || this.tip().find(".tooltip-arrow")
          }

          ,
        validate: function() {
            if (!this.$element[0].parentNode) {
              this.hide()
              this.$element = null
              this.options = null
            }
          }

          ,
        enable: function() {
            this.enabled = true
          }

          ,
        disable: function() {
            this.enabled = false
          }

          ,
        toggleEnabled: function() {
            this.enabled = !this.enabled
          }

          ,
        toggle: function(e) {
            var self = e ? $(e.currentTarget)[this.type](this._options).data(this.type) : this
            self.tip().hasClass('in') ? self.hide() : self.show()
          }

          ,
        destroy: function() {
          this.hide().$element.off('.' + this.type).removeData(this.type)
        }

      }


      /* TOOLTIP PLUGIN DEFINITION
       * ========================= */

      var old = $.fn.tooltip

      $.fn.tooltip = function(option) {

        return this.each(function() {
          var $this = $(this),
            data = $this.data('tooltip'),
            options = typeof option == 'object' && option
          if (!data) $this.data('tooltip', (data = new Tooltip(this, options)))
          if (typeof option == 'string') data[option]()
        })
      }

      $.fn.tooltip.Constructor = Tooltip

      $.fn.tooltip.defaults = {
        animation: true,
        type: 'default' //tip 绫诲瀷 {string} 'default'|'primary'|'attention'|'info'|'confirm' ,鍖哄埆瑙乨emo
          ,
        placement: 'top',
        selector: false //閫氬父瑕侀厤鍚堣皟鐢ㄦ柟娉曚娇鐢紝濡傛灉tooltip鍏冪礌寰堝锛岀敤姝ら€斿緞杩涜浜嬩欢濮旀墭鍑忓皯浜嬩欢鐩戝惉鏁伴噺: $('body').tooltip({selector: '.tips'})
          ,
        trigger: 'hover focus' //瑙﹀彂鏂瑰紡锛屽閫夛細click hover focus锛屽鏋滃笇鏈涙墜鍔ㄨЕ鍙戯紝鍒欎紶鍏�'manual'
          ,
        title: 'it is default title' //榛樿tooltip鐨勫唴瀹癸紝濡傛灉缁檋tml鍏冪礌娣诲姞浜唗itle灞炴€у垯浣跨敤璇tml灞炴€ф浛浠ｆ灞炴€�
          ,
        delay: { show: 0, hide: 200 } //濡傛灉鍙紶number锛屽垯show銆乭ide鏃堕兘浼氫娇鐢ㄨ繖涓欢鏃讹紝鑻ユ兂宸紓鍖栧垯浼犲叆褰㈠{show:400, hide: 600} 鐨勫璞�   娉細delay鍙傛暟瀵筸anual瑙﹀彂鏂瑰紡鐨則ooltip鏃犳晥
        ,
        html: true //鍐冲畾鏄痟tml()杩樻槸text()
          ,
        container: false //灏唗ooltip涓庤緭鍏ユ缁勪竴鍚屼娇鐢ㄦ椂锛屼负浜嗛伩鍏嶄笉蹇呰鐨勫奖鍝嶏紝闇€瑕佽缃甤ontainer.浠栫敤鏉ュ皢tooltip鐨刣om鑺傜偣鎻掑叆鍒癱ontainer鎸囧畾鐨勫厓绱犲唴鐨勬渶鍚庯紝鍙悊瑙ｄ负 container.append(tooltipDom)銆�
          ,
        widthlimit: true // {Boolean|string} tooltip鍏冪礌鏈€澶у搴﹂檺鍒讹紝false涓嶉檺瀹斤紝true闄愬300px锛屼篃鍙紶鍏�"500px",浜哄伐闄愬埗瀹藉害
          ,
        align: 'center' // {string} tip鍏冪礌鐨勫竷灞€鏂瑰紡锛岄粯璁ゅ眳涓細'center' ,'left','right','top','bottom'
      }


      /* TOOLTIP NO CONFLICT
       * =================== */

      $.fn.tooltip.noConflict = function() {
        $.fn.tooltip = old
        return this
      }

      //document ready init
      $(function() {
        $('[data-toggle="tooltip"]').tooltip()

        //mousedown澶栭儴鍙秷澶眛ooltip(涓轰簡鍦╟lick鍥炶皟鎵ц鍓嶅鐞嗗ソdom鐘舵€�)
        $(document).on('mousedown', function(e) {
          var tgt = $(e.target),
            tip = $('.sui-tooltip'),
            switchTgt = tip.prev(),
            tipContainer = tgt.parents('.sui-tooltip')
          /* 閫昏緫鎵ц鏉′欢涓€娆℃敞閲婏細
           * 1銆佸瓨鍦╰ip
           * 2銆佺偣鍑荤殑涓嶆槸tip鍐呯殑鏌愬尯鍩�
           * 3銆佺偣鍑荤殑涓嶆槸瑙﹀彂鍏冪礌鏈韩
           * 4銆佽Е鍙戝厓绱犱负澶嶆潅HTML缁撴瀯鏃讹紝鐐瑰嚮鐨勪笉鏄Е鍙戝厓绱犲唴鐨勫尯鍩�
           */
          // 杩欓噷鍐冲畾浜哾ata-original-title灞炴€у繀椤诲瓨鍦ㄤ簬瑙﹀彂鍏冪礌涓�
          if (tip.length && !tipContainer.length && tgt[0] != switchTgt[0] && tgt.parents('[data-original-title]')[0] != switchTgt[0]) {
            switchTgt.trigger('click.tooltip')
          }
        })

        //涓篶onfirm绫诲瀷tooltip澧炲姞鍙栨秷鎸夐挳璁剧疆榛樿閫昏緫
        $(document).on('click', '[data-dismiss=tooltip]', function(e) {
          e.preventDefault()
          $(e.target).parents('.sui-tooltip').prev().trigger('click.tooltip')
        })
        $(document).on('click', '[data-ok=tooltip]', function(e) {
          e.preventDefault()
          var triggerEle = $(e.target).parents('.sui-tooltip').prev(),
            instance = triggerEle.data('tooltip'),
            okHideCallback = instance.options.okHide
          if (typeof okHideCallback == 'function') {
            okHideCallback.call(triggerEle)
          }
        })

      })

    }(window.jQuery);

  }, {}],
  17: [function(require, module, exports) {
    /* ===================================================
     * bootstrap-transition.js v2.3.2
     * http://getbootstrap.com/2.3.2/javascript.html#transitions
     * ===================================================
     * Copyright 2013 Twitter, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * ========================================================== */


    ! function($) {

      "use strict";


      /* CSS TRANSITION SUPPORT (http://www.modernizr.com/)
       * ======================================================= */

      $(function() {

        $.support.transition = (function() {

          var transitionEnd = (function() {

            var el = document.createElement('bootstrap'),
              transEndEventNames = {
                'WebkitTransition': 'webkitTransitionEnd',
                'MozTransition': 'transitionend',
                'OTransition': 'oTransitionEnd otransitionend',
                'transition': 'transitionend'
              },
              name

            for (name in transEndEventNames) {
              if (el.style[name] !== undefined) {
                return transEndEventNames[name]
              }
            }

          }())

          return transitionEnd && {
            end: transitionEnd
          }

        })()

      })

    }(window.jQuery);

  }, {}],
  18: [function(require, module, exports) {
    /**
     * Created by huazhi.chz on 14-4-27.
     * tree 2.0.0
     * 鐢卞師鏉ョ殑涓€娆℃€ц鍙栨暟鎹敼涓轰簨浠舵€ц幏鍙栨暟鎹�
     */

    !(function($) {
      "use strict";

      // 鏁版嵁缂撳瓨澶勭悊
      var Redis = function() {
        this.data = {};
      };

      Redis.prototype = {
        constructor: Redis,

        query: function(key) {
          return this.data[key];
        },

        insert: function(key, value) {
          this.data[key] = value;
        },

        clear: function() {
          this.data = {};
        }
      };

      var Tree = function(element, options) {
        this.$element = $(element);
        this.options = options;
        this.redis = new Redis();
      };

      // private methods
      var methods = {
        init: function() {
          this.destory();
          methods.bindChange.call(this);
          methods.bindUpdate.call(this);
          this.$element.trigger('tree:update'); // 瑙﹀彂绗竴娆℃洿鏂�
        },

        getData: function(id, index) {
          var that = this,
            data = that.redis.query(id); // 鍏堣幏鍙栫紦瀛樻暟鎹�
          if (!that.options.src) return;
          // 鍏堝彇缂撳瓨鏁版嵁
          if (data) {
            methods.createDom.apply(that, [data, index])
          } else { // 濡傛灉娌℃湁灏遍噸鏂拌幏鍙�
            $.ajax(that.options.src, {
              data: that.options.key + '=' + id,
              cache: true,
              dataType: that.options.jsonp ? 'jsonp' : 'json'
            }).success(function(json) {
              if (json.code == 200 && json.data && json.data.length) {
                data = json.data;
                that.redis.insert(id, data); // 灏嗗€煎瓨鏀剧紦瀛樹腑
                methods.createDom.apply(that, [data, index]);
              }
            })
          }
        },

        createDom: function(list, index) {
          var dom = ['<select>'],
            placeholder = this.options.placeholder,
            val = this.options.val[index];
          placeholder && dom.push('<option value="">' + placeholder + '</option>');
          $.each(list, function(i, n) {
            dom.push('<option data-isleaf="' + n.isleaf + '" value="' + n.id + '" ' + (n.id == val ? 'selected' : '') + '>' + n.value + '</option>')
          });
          dom.push('</select>');
          //return dom.join('');
          dom = $(dom.join('')).appendTo(this.$element).trigger('change');
        },

        bindChange: function() {
          var that = this;
          this.$element.on('change.sui.tree', 'select', function(e) {
            var $this = $(this),
              v = $this.val();
            $this.nextAll().remove();
            methods.saveValue.call(that);
            if (!v) return; // 閫夋嫨浜唒laceholder
            if (!$this.find('option:selected').data('isleaf')) methods.getData.apply(that, [v, $this.index() + 1]);
            else that.options.val = []; // 娓呯┖鍒濆鍖栫殑鏃跺€欒缃殑鍊�
          })
        },

        bindUpdate: function() {
          var that = this;
          this.$element.on('tree:update', function(e) {
            var $this = $(this);
            $this.empty();
            methods.getData.apply(that, [0, 0]); // 姣忔閲嶆柊鑾峰彇鏁版嵁鐨刬d閮戒负0
          })
        },

        saveValue: function() {
          var _val = [],
            _opt = [];
          this.$element.find('select').each(function() {
            _val.push(this.value);
            _opt.push($(this).find('option:selected').text());
          });
          this.datas = { text: _opt, value: _val };
        }
      };

      Tree.prototype = {
        constructor: Tree,

        getValue: $.noop, // how ?

        setValue: function(ary) {
          this.options.val = ary;
          this.$element.trigger('tree:update');
        },

        destory: function() {
          this.$element.off('change.sui.tree').empty();
        }
      };

      var old = $.fn.tree;

      $.fn.extend({
        tree: function() {
          var args = Array.prototype.slice.call(arguments),
            arg0 = args.shift();

          return this.each(function() {
            var $this = $(this),
              data = $this.data('tree'),
              options = $.extend({}, $.fn.tree.defaults, $this.data(), typeof arg0 === 'object' && arg0);
            if (!data) $this.data('tree', (data = new Tree(this, options))); // 鍦ㄦ瘡涓厓绱犱笂鍙繚瀛樹竴涓疄渚�
            if (typeof arg0 === 'string' && typeof data[arg0] === 'function') data[arg0].apply(data, args);
            else methods.init.call(data);
          });
        }
      });

      $.fn.tree.Constructor = Tree;

      $.fn.tree.defaults = {
        src: '', // 鏁版嵁婧愶紝json鎴杍sonp
        treeType: 'select', // TODO tree鐨勭被鍨嬶紝select鎴杔ist
        placeholder: '璇烽€夋嫨',
        val: [], // update鏃跺彇鐨勫€�
        key: 'id' // 榛樿鐨勫弬鏁板悕
      };

      // NO CONFLICT
      $.fn.tree.noConflict = function() {
        $.fn.tree = old;
        return this;
      };

      // auto handle
      $(function() {
        $('[data-toggle="tree"]').tree();
      });

    })(jQuery);

  }, {}],
  19: [function(require, module, exports) {
    // add rules
    ! function($) {
      Validate = $.validate;
      trim = function(v) {
        if (!v) return v;
        return v.replace(/^\s+/g, '').replace(/\s+$/g, '')
      };
      var required = function(value, element, param) {
        var $input = $(element)
        return !!trim(value);
      };
      var requiredMsg = function($input, param) {
        var getWord = function($input) {
          var tagName = $input[0].tagName.toUpperCase();
          var type = $input[0].type.toUpperCase();
          if (type == 'CHECKBOX' || type == 'RADIO' || tagName == 'SELECT') {
            return '閫夋嫨'
          }
          return '濉啓'
        }
        return "璇�" + getWord($input)
      }
      Validate.setRule("required", required, requiredMsg);

      var prefill = function(value, element, param) {
        var $input = $(element)
        if (param && typeof param === typeof 'a') {
          var $form = $input.parents("form")
          var $required = $form.find("[name='" + param + "']")
          return !!$required.val()
        }
        return true
      }
      Validate.setRule("prefill", prefill, function($input, param) {
        var getWord = function($input) {
          var tagName = $input[0].tagName.toUpperCase();
          var type = $input[0].type.toUpperCase();
          if (type == 'CHECKBOX' || type == 'RADIO' || tagName == 'SELECT') {
            return '閫夋嫨'
          }
          return '濉啓'
        }
        if (param && typeof param === typeof 'a') {
          var $form = $input.parents("form")
          var $required = $form.find("[name='" + param + "']")
          if (!$required.val()) {
            return "璇峰厛" + getWord($required) + ($required.attr("title") || $required.attr("name"))
          }
        }
        return '閿欒'
      });
      var match = function(value, element, param) {
        value = trim(value);
        return value == $(element).parents('form').find("[name='" + param + "']").val()
      };
      Validate.setRule("match", match, '蹇呴』涓�$0鐩稿悓');
      var number = function(value, element, param) {
        value = trim(value);
        return (/^\d+(.\d*)?$/).test(value)
      };
      Validate.setRule("number", number, '璇疯緭鍏ユ暟瀛�');
      var digits = function(value, element, param) {
        value = trim(value);
        return (/^\d+$/).test(value)
      };
      Validate.setRule("digits", digits, '璇疯緭鍏ユ暣鏁�');
      var mobile = function(value, element, param) {
        return (/^0?1[3|4|5|7|8][0-9]\d{8,9}$/).test(trim(value));
      };
      Validate.setRule("mobile", mobile, '璇峰～鍐欐纭殑鎵嬫満鍙风爜');
      var tel = function(value, element, param) {
        return (/^[+]{0,1}(\d){1,3}[ ]?([-]?((\d)|[ ]){1,11})+$/).test(trim(value));
      };
      Validate.setRule("tel", tel, '璇峰～鍐欐纭殑鐢佃瘽鍙风爜');
      var email = function(value, element, param) {
        return (/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(trim(value)); //"
      };
      Validate.setRule("email", email, '璇峰～鍐欐纭殑email鍦板潃');
      var zip = function(value, element, param) {
        return (/^[1-9][0-9]{5}$/).test(trim(value));
      };
      Validate.setRule("zip", zip, '璇峰～鍐欐纭殑閭紪');
      var date = function(value, element, param) {
        param = param || "-";
        var reg = new RegExp("^[1|2]\\d{3}" + param + "[0-2][0-9]" + param + "[0-3][0-9]$");
        return reg.test(trim(value));
      };
      Validate.setRule("date", date, '璇峰～鍐欐纭殑鏃ユ湡');
      var time = function(value, element, param) {
        return (/^[0-2]\d:[0-6]\d$/).test(trim(value));
      };
      Validate.setRule("time", time, '璇峰～鍐欐纭殑鏃堕棿');
      var datetime = function(value, element, param) {
        var reg = new RegExp("^[1|2]\\d{3}-[0-2][0-9]-[0-3][0-9] [0-2]\\d:[0-6]\\d$");
        return reg.test(trim(value));
      };
      Validate.setRule("datetime", datetime, '璇峰～鍐欐纭殑鏃ユ湡鍜屾椂闂�');
      var url = function(value, element, param) {
        var urlPattern;
        value = trim(value);
        urlPattern = /(http|ftp|https):\/\/([\w-]+\.)+[\w-]+\.(com|net|cn|org|me|io|info|xxx)/;
        if (!/^http/.test(value)) {
          value = 'http://' + value;
        }
        return urlPattern.test(value);
      };
      Validate.setRule("url", url, '璇峰～鍐欐纭殑缃戝潃');
      var minlength = function(value, element, param) {
        return trim(value).length >= param;
      };
      Validate.setRule("minlength", minlength, '闀垮害涓嶈兘灏戜簬$0');
      var maxlength = function(value, element, param) {
        return trim(value).length <= param;
      };
      Validate.setRule("maxlength", maxlength, '闀垮害涓嶈兘瓒呰繃$0');

      var gt = function(value, element, param) {
        return Number(value) > param;
      };
      Validate.setRule("gt", gt, '蹇呴』澶т簬$0');

      var lt = function(value, element, param) {
        return Number(value) < param;
      };
      Validate.setRule("lt", lt, '蹇呴』灏忎簬$0');

    }(window.jQuery)

  }, {}],
  20: [function(require, module, exports) {
    /*
     * validate 鏍稿績鍑芥暟锛屽彧鎻愪緵妗嗘灦锛屼笉鎻愪緵鏍￠獙瑙勫垯
     */

    ! function($) {
      'use strict';
      var Validate = function(form, options) {
        var self = this;
        this.options = $.extend({}, $.fn.validate.defaults, options)
        this.$form = $(form).attr("novalidate", 'novalidate');
        this.$form.submit(function() {
          return onsubmit.call(self);
        });
        this.disabled = false;
        this.$form.on('blur keyup change update', 'input, select, textarea', function(e) {
          if (self.disabled) return;
          var $target = $(e.target);
          if ($target.attr("disabled")) return;
          update.call(self, $target);
        });
        this.errors = {};
      };
      Validate.rules = {};

      Validate.setRule = function(name, method, msg) {
        var oldRule = Validate.rules[name];
        if (oldRule && !method) {
          method = oldRule.method
        }
        Validate.rules[name] = {
          method: method,
          msg: msg
        };
      };
      Validate.setMsg = function(name, msg) {
        Validate.setRule(name, undefined, msg)
      }

      Validate.prototype = {
        disable: function() {
          this.disabled = true;
          this.hideError();
        },
        enable: function() {
          this.disabled = false;
        },
        showError: function($input, errorMsg, errorName) {
          showError.call(this, $input, errorMsg, errorName);
        },
        hideError: function($input, errorName) {
          hideError.call(this, $input, errorName);
        }
      }

      var onsubmit = function() {
        if (this.disabled) return true;
        var hasError, self;
        self = this;
        hasError = false;
        var errorInputs = [];
        this.$form.find("input, select, textarea").each(function() {
          var $input, error;
          $input = $(this);
          error = update.call(self, this);
          if (error && !hasError) {
            $input.focus();
          }
          if (error) {
            errorInputs.push($input);
            return hasError = true;
          }
        });
        if (hasError) {
          this.options.fail.call(this, errorInputs, this.$form);
        } else {
          var result = this.options.success.call(this, this.$form);
          if (result === false) {
            return false;
          }
        }
        return !hasError;
      };
      var update = function(input) {
        var $input = $(input);
        var rules = {};
        var dataRules = ($input.data("rules") || "").split('|');
        var inputName = $input.attr("name");
        for (var i = 0; i < dataRules.length; i++) {
          if (!dataRules[i]) continue;
          var tokens = dataRules[i].split('=');
          tokens[1] = tokens[1] || undefined;
          rules[tokens[0]] = tokens[1];
        }
        var configRules = (this.options.rules && this.options.rules[inputName]) || {};
        rules = $.extend(rules, configRules)
        var error = false;
        var msg = null;
        for (var name in rules) {
          var value = rules[name];

          var currentRule = Validate.rules[name];
          if (!currentRule) { //鏈畾涔夌殑rule
            throw new Error("鏈畾涔夌殑鏍￠獙瑙勫垯锛�" + name);
          }
          var inputVal = val($input);
          if ((!inputVal) && name !== 'required') { //鐗规畩澶勭悊锛屽鏋滃綋鍓嶈緭鍏ユ娌℃湁鍊硷紝骞朵笖褰撳墠涓嶆槸required锛屽垯涓嶆姤閿�
            error = false;
            hideError.call(this, $input);
            continue
          }
          var result = true
          // 濡傛灉瑙勫垯鍊兼槸涓€涓嚱鏁帮紝鍒欑洿鎺ョ敤姝ゅ嚱鏁扮殑杩斿洖鍊�
          if ($.isFunction(value)) {
            result = value.call(this, $input)
          } else {
            result = currentRule.method.call(this, inputVal, $input, value)
          }
          if (result) {
            error = false;
            hideError.call(this, $input, name);
          } else {
            error = true;
            msg = currentRule.msg;
            if ($.isFunction(msg)) msg = msg($input, value)
            //濡傛灉涓嶆槸required瑙勫垯锛屽垯鍙互浣跨敤鑷畾涔夐敊璇秷鎭�
            if (name !== 'required') {
              if ($input.data("error-msg")) {
                msg = $input.data("error-msg")
              }
              if (this.options.messages && this.options.messages[inputName]) {
                msg = this.options.messages[inputName]
                if ($.isFunction(msg)) msg = msg($input, value)
                if ($.isArray(msg)) msg = msg[1]
              }
            }
            //濡傛灉鏄痳equired瑙勫垯
            if (name === 'required') {
              if ($input.data("empty-msg")) {
                msg = $input.data("empty-msg")
              }
              if (this.options.messages && this.options.messages[inputName]) {
                var _msg = this.options.messages[inputName]
                if ($.isFunction(_msg)) _msg = msg($input, value)
                if ($.isArray(_msg)) msg = _msg[0]
              }
            }
            this.showError($input, msg.replace('$0', value), name);
            break;
          }
        }

        return error;
      };
      var showError = function($input, errorMsg, errorName) {
        errorName = errorName || "anonymous" //鍖垮悕鐨勶紝涓€鑸槸鎵嬪姩璋冪敤showError骞朵笖娌℃湁鎸囧畾涓€涓悕绉版椂鍊欎細鏄剧ず涓€涓尶鍚嶇殑閿欒
        if (typeof $input === typeof "a") $input = this.$form.find("[name='" + $input + "']");
        $input = $($input);
        var inputName = $input.attr("name")
        var $errors = this.errors[inputName] || (this.errors[inputName] = {});
        var $currentError = $errors[errorName]
        if (!$currentError) {
          $currentError = ($errors[errorName] = $(this.options.errorTpl.replace("$errorMsg", errorMsg)));
          this.options.placeError.call(this, $input, $currentError);
        }
        for (var k in $errors) {
          if (k !== errorName) $errors[k].hide()
        }
        this.options.highlight.call(this, $input, $currentError, this.options.inputErrorClass)
        $input.trigger("highlight");
      };
      var hideError = function($input, errorName) {
        var self = this;
        var hideInputAllError = function($input) {
          var $errors = self.errors[$input.attr('name')];
          for (var k in $errors) {
            self.options.unhighlight.call(self, $input, $errors[k], self.options.inputErrorClass);
          }
        }
        if (!$input) { //娌℃湁浠讳綍鍙傛暟锛屽垯闅愯棌鎵€鏈夌殑閿欒
          this.$form.find('input, select, textarea').each(function() {
            var $this = $(this);
            if ($this.attr("disabled")) return;
            hideInputAllError($this);
          });
        }
        if (typeof $input === typeof "a") $input = this.$form.find("[name='" + $input + "']");
        $input = $($input);
        var $errors = this.errors[$input.attr('name')];
        if (!$errors) return;
        if (!errorName) {
          //鏈寚瀹歟rrorName鍒欓殣钘忔墍鏈塃rrorMsg
          hideInputAllError($input);
          return;
        }
        var $error = $errors[errorName];
        if (!$error) return;
        this.options.unhighlight.call(this, $input, $error, this.options.inputErrorClass)
        $input.trigger("unhighlight");
      };

      //鏍规嵁涓嶅悓鐨刬nput绫诲瀷鏉ュ彇鍊�
      var val = function(input) {
        var $input = $(input);
        if (!$input[0]) return undefined;
        var tagName = $input[0].tagName.toUpperCase();
        var type = ($input.attr("type") || 'text').toUpperCase()
        var name = $input.attr("name")
        var $form = $input.parents("form")
        switch (tagName) {
          case 'INPUT':
            switch (type) {
              case 'CHECKBOX':
              case 'RADIO':
                return $form.find("[name='" + name + "']:checked").val()
              default:
                return $input.val()
            }
            break;
          case 'TEXTAREA':
            return $input.val()
            break;
          default:
            return $input.val()
        }
      }

      var old = $.fn.validate;

      $.fn.extend({
        validate: function(options) {
          var args = arguments;
          return this.each(function() {
            var $this = $(this),
              data = $this.data("validate")
            if (!data) $this.data('validate', (data = new Validate(this, options)))
            if (typeof options == 'string') data[options].apply(data, Array.prototype.slice.call(args, 1));
          })
        }
      })
      $.fn.validate.Constructor = Validate

      $.fn.validate.defaults = {
        errorTpl: '<div class="sui-msg msg-error help-inline">\n  <div class="msg-con">\n    <span>$errorMsg</span>\n </div>   <i class="msg-icon"></i>\n  \n</div>',
        inputErrorClass: 'input-error',
        placeError: function($input, $error) {
          $input = $($input);
          var $wrap = $input.parents(".controls-wrap");
          if (!$wrap[0]) {
            $wrap = $input.parents(".controls");
          }
          if (!$wrap[0]) {
            $wrap = $input.parent();
          }
          $error.appendTo($wrap[0]);
        },
        highlight: function($input, $error, inputErrorClass) {
          $input.addClass(inputErrorClass)
          //浣垮鎺т欢鏍￠獙瑙勫垯閿欒妗嗗彲浠ヨ嚜鍔ㄥ畾浣嶅嚭閿欑殑鎺т欢浣嶇疆锛屽厛灏嗚嚜韬Щ鍔ㄥ幓璇ヤ綅缃檮杩戞樉绀�
          //瀵瑰崟浣撴牎楠屾帶浠讹紝鍥犱负鏄嚜韬玜ppend鍒拌嚜韬殑浣嶇疆锛宯ative涓嶄細鏈夎涓�
          $.fn.validate.defaults.placeError($input, $error);
          $error.show()
        },
        unhighlight: function($input, $error, inputErrorClass) {
          if (!$error.is(":visible")) return;
          $input.removeClass(inputErrorClass)
          $error.hide()
        },
        rules: undefined,
        messages: undefined,
        success: $.noop,
        fail: $.noop
      };

      $.fn.validate.noConflict = function() {
        $.fn.validate = old
        return this
      }

      $.validate = Validate;

      //鑷姩鍔犺浇
      $(function() {
        $(".sui-validate").validate()
      })
    }(window.jQuery);

  }, {}]
}, {}, [12]);



// kmsjsmap
// 思维导图JS库
(function($w) {
  if (!$w.jsMind) return;

  var __NAME__ = 'kmsjsmap'
  var logger = (typeof console === 'undefined') ? {
    log: _noop,
    debug: _noop,
    error: _noop,
    warn: _noop,
    info: _noop
  } : console;

  if (typeof module === 'undefined' || !module.exports) {
    if (typeof $w[__NAME__] !== 'undefined') {
      logger.log(__NAME__ + '已经存在啦啦啦啦~');
      return;
    }
  }

  var kmsjsmap = {
    options: '',
    isInit: false,
    editable: true,
    onRelation: _noop
  }


  kmsjsmap.init = function(options) {
    // console.log('init:', options)
    if (!options || Object.keys(options).length === 0) {
      logger.warn('请对' + __NAME__ + '.init()传入必要的参数');
      return;
    }
    if (this.isInit) return;
    this.isInit = true;
    this.options = options;
    this.editable = options.editable === true ? true : false;
    if (options.onRelation) this.onRelation = options.onRelation;
    this._load_jsmind();
    this._init_button();
  }

  var _jm = null;

  // 初始化思维导图
  kmsjsmap._load_jsmind = function() {
    var options = {
      container: this.options.container,
      editable: this.editable,
      theme: 'primary',
      mode: 'full',
      shortcut: {
        enable: false // 是否启用快捷键
      },
      onRelation: this.onRelation
    }
    var mind = {
      'meta': {
        'name': '思维导图JS库',
        'author': 'Leo',
        'version': '1.0'
      },
      'format': 'node_array',
      'data': this.options.data
    }
    _jm = new jsMind(options);
    _jm.show(mind);
  }

  // 创建功能按钮
  kmsjsmap._init_button = function() {
    $(function() {
      // 0517去掉 - 内置保存按钮
      // var html = '<a href="javascript: kmsjsmap.onSave()" class="sui-btn btn-xlarge btn-primary">保存思维导图</a>';
      // $('#' + kmsjsmap.options.container).prepend(html);
      // 给每个节点加上右键菜单事件
      $('jmnode').on('contextmenu', kmsjsmap._conTextMenuEvenHandle);
    })
  }


  // 右键菜单方法
  kmsjsmap._conTextMenuEvenHandle = function(e) {
    e.preventDefault();
    if (!kmsjsmap.editable) return;
    // console.log('右键拉拉拉拉')
    $conTextMenu.show().css({
      left: e.pageX,
      top: e.pageY
    })
  }


  kmsjsmap._get_selected_nodeid = function() {
    var selected_node = _jm.get_selected_node();
    if (!!selected_node) {
      return selected_node.id;
    } else {
      return null;
    }
  }


  // 思维导图库JS 保存回调
  kmsjsmap.save = function(cb) {
    var data = _jm.get_data('node_array').data;
    // console.log(data)
    // var cb = this.options.onSave;
    cb && cb(data);
  }


  // 删除节点
  kmsjsmap.del_node = function() {
    var that = this;
    $conTextMenu.hide();
    $.confirm({
      title: '温馨提示',
      body: '确认删除此节点吗?',
      okBtn: '是是是',
      cancelBtn: '不是,我手滑了',
      okHidden: function() {
        var selected_id = that._get_selected_nodeid();
        _jm.remove_node(selected_id);
      }
    })
  }

  // 编辑节点
  kmsjsmap.modify_node = function() {
    $conTextMenu.hide();
    var node = _jm.get_selected_node();
    _jm.begin_edit(node);
  }

  // 新增节点
  kmsjsmap.add_node = function() {
    $conTextMenu.hide();
    var nodeid = jsMind.util.uuid.newid();
    var topic = '请输入子节点名称';
    var node = _jm.add_node(_jm.get_selected_node(), nodeid, topic, { badge: 0 }, 'right');
    // console.log(node);
    _jm.begin_edit(node);
    // 为了给新添加的节点也加上右键菜单
    $('jmnode').off('contextmenu', function() {});
    $('jmnode').on('contextmenu', kmsjsmap._conTextMenuEvenHandle);
  }

  // 关联节点
  kmsjsmap.relation_node = function() {
    $conTextMenu.hide();
    var node = _jm.get_selected_node();
    kmsjsmap.onRelation(node);
  }

  kmsjsmap.screenshot = function() {
    _jm.screenshot.shootDownload();
  }

  $w[__NAME__] = kmsjsmap
})(window);