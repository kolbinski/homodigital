var X = (function(W){
	var B,
		j,
		k,
		instance,
		params = {},
		register = {},
		getInstance = function(){
			if(!instance){
				instance = init();
			}
			return instance;
		},
		cssArray = function(obj, styles){
			k = styles.length;
			while(k--){
				obj.style[styles[k][0]] = styles[k][1];
			}
		},
		_return = {
			W: W,
			B: null,
			register: function(tag, _config){
				register[tag] = _config || {};
				return getInstance();
			},
			css: function(_tag, style){
				cssArray(_tag, style);
			},
			tagCss: function(_this, styles){
				_this.css.push(styles);
			}
		};
	function init() {
		var D, instance, _prototype, i, tmp, tag, tags,
			addClass = function(obj, _class){
				obj.className += ' ' + _class;
			},
			addEvent = function(obj, event, func){
				if(obj.addEventListener){
					obj.addEventListener(event, func);
				}else{
					obj.attachEvent('on'+event, func);
				}
			},
			onload = function(){
				D = W.document;
				B = D.getElementsByTagName('body')[0];
				_return.B = B;
				for(tag in register){
					if(D.registerElement){
						_prototype = Object.create(HTMLElement.prototype);
						_prototype.createdCallback = createdCallback;
						D.registerElement('x-' + tag, {prototype: _prototype});
					}else{
						tags = D.getElementsByTagName('x-'+tag);
						j = tags.length;
						while(j--){
							if(W.getComputedStyle){
								createdCallbackFallback(tags[j], tag, true);
							}else{
								tmp = D.createElement('div');
								tmp.className = 'x-'+tag;
								tags[j].parentNode.insertBefore(tag, tags[j].nextSibling.nextSibling);
								createdCallbackFallback(tmp, tag, true);
							}
						}
					}
				}
			},
			createdCallbackFallback = function(_this, _tag, registerTargetEvents){
				_this.css = [];
				_this.transform = {};
				if(register[_tag].extends){
					createdCallbackFallback(_this, register[_tag].extends, false);
				}
				_this.style.position = 'relative';
				_this.style.display = 'inline-block';
				_this.style.transformStyle = 'preserve-3d';
				addClass(_this, 'x-'+_tag);
				if(register[_tag].onCreate){
					register[_tag].onCreate(_this);
				}
				if(register[_tag].events){
					for(tmp in register[_tag].events){
						addEvent(_this, tmp, register[_tag].events[tmp]);
					}
				}
				if(registerTargetEvents && register[_tag].targetEvents){
					tmp = register[_tag].targetEvents.length;
					while(tmp--){
						for(i in register[_tag].targetEvents[tmp].events){
							addEvent(register[_tag].targetEvents[tmp].target, i, register[_tag].targetEvents[tmp].events[i].func);
							if(register[_tag].targetEvents[tmp].events[i].trigger){
								register[_tag].targetEvents[tmp].events[i].func();
							}
						}
					}
				}
				cssArray(_this, _this.css);
				tmp = [];
				for(i in _this.transform){
					tmp.push(i + '(' + _this.transform[i] + ')');
				}
				_this.style.transform = tmp.join(' ');
				//todo - fallback dla IE9
			},
			createdCallback = function(){
				createdCallbackFallback(this, tag, true);
			};
		addEvent(W, 'load', onload);
		return _return;
	};
	return {
		getInstance: getInstance
	};
})(window);

/*
function has3d() {
    if (!window.getComputedStyle) {
        return false;
    }

    var el = document.createElement('p'), 
        has3d,
        transforms = {
            'webkitTransform':'-webkit-transform',
            'OTransform':'-o-transform',
            'msTransform':'-ms-transform',
            'MozTransform':'-moz-transform',
            'transform':'transform'
        };

    // Add it to the body to get the computed style.
    document.body.insertBefore(el, null);

    for (var t in transforms) {
        if (el.style[t] !== undefined) {
            el.style[t] = "translate3d(1px,1px,1px)";
            has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
        }
    }

    document.body.removeChild(el);

    return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
}
*/