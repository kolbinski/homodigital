var x = X.getInstance()

	.register('floor', {
		ref: null,
		onCreate: function(_this){
			ref = _this;
			_this.perspective = _this.getAttribute('data-perspective') || 600;
			_this.rayOrigin = {
				top: _this.getAttribute('data-ray-origin-top') || 0,
				left: _this.getAttribute('data-ray-origin-left') || '50%'
			};
			x.css(x.B,[
				['perspective',_this.perspective+'px'],
				['transform-style','preserve-3d'],
				['overflow-x','hidden']
			]);
			//x.tagCss(_this, ['perspective',_this.perspective+'px']);
			x.tagCss(_this, ['transform-style','preserve-3d']);
		},
		targetEvents:[
			{
				target: window,
				events:{
					scroll: {
						trigger: true,
						func: function(){
							var _x = '50%', 
								_y = 'calc(' + 100 
									* (x.W.pageYOffset | x.B.scrollTop) / (1 * x.W.getComputedStyle(x.B).height.replace('px','')) 
									+ '% + '+ref.rayOrigin.top+'px)';
							var perspectiveOrigin = [_x, _y];
							//console.log(perspectiveOrigin.join(' '));
							x.css(x.B, [['perspective-origin', perspectiveOrigin.join(' ')]]);
						}
					}
				}
			}
		]
	})

	.register('flap', {
		onCreate: function(_this){
			_this.edge = _this.getAttribute('data-edge') || 'bottom';
			_this.position = _this.getAttribute('data-position') || 'fit';
			_this.rotate = _this.getAttribute('data-rotate') || 0;
			_this.axis = (_this.edge === 'top' || _this.edge === 'bottom')?'X':'Y';
			x.tagCss(_this, 
				['position', 'absolute']/*, 
				['perspective', '400px'],
				['transform-style','preserve-3d']*/
			);
			if(_this.edge === 'bottom'){
				x.tagCss(_this, ['bottom', 0]);
			}else{
				x.tagCss(_this, ['top', 0]);
			}
			if(_this.edge === 'right'){
				x.tagCss(_this, ['right', 0]);
			}else{
				x.tagCss(_this, ['left', 0]);
			}
			_this.transformOriginTop = 0;
			_this.transformOriginLeft = 0;
			if(_this.edge === 'top'){
				_this.transformOriginTop = 100;
			}
			if(_this.edge === 'left'){
				_this.transformOriginLeft = 100;
			}
			_this.translateAxis = 'Y';
			if(_this.edge === 'left' || _this.edge === 'right'){
				_this.translateAxis = 'X';
				_this.orientation = 'vertical';
			}
			if(_this.edge === 'top' || _this.edge === 'bottom'){
				_this.orientation = 'horisontal';
			}
			_this.translateValue = '';
			if(_this.edge === 'left' || _this.edge === 'top'){
				_this.translateValue = '-';
			}
			if(_this.edge === 'top' || _this.edge === 'right'){
				_this.rotate *= -1;
			}
			if(_this.position === 'fit'){
				x.tagCss(_this, [[_this.orientation === 'horisontal'?'width':'height'], '100%']);
			}
			if(_this.edge === 'top'){
				_this.parentElement.style.marginTop = x.W.getComputedStyle(_this).height;
			}
			_this.rotateAxis = _this.translateAxis==='X'?'Y':'X';
			_this.transform['translate'+_this.translateAxis] = _this.translateValue+'100%';
			_this.transform['rotate'+_this.rotateAxis] = _this.rotate+'deg';
			x.tagCss(_this, ['transform-origin', _this.transformOriginLeft+'% '+_this.transformOriginTop+'%']);
		},
		events: {
		}
	})

	.register('anchor', {
		onCreate: function(){
			
		}
	});
/*
.register('flap', {
		//extends: 'ssak',
		onCreate: function(_this){
			// czlowiek oncretated
		},
		events: {
			click: function(_this){
				//alert('jestem czlowiekiem');
			}
		},
		targetEvents:[
			{
				target: window,
				events:{
					scroll: function(){},
					resize: function(){}
				}
			}
		]
	});
*/

/*window.onload = function(){
var color = window.getComputedStyle(
	document.querySelector('div'), ':before'
).getPropertyValue('content');
alert(color);
}*/