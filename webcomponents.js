/*
	todo: find a way to group components as sets
	todo: Find a way to output easier than toString()
	todo: async loading/rendering of components
	todo: Support for constructor attribute
	todo: Support for extend attribute
	todo: As each element is replaced, a non-bubbling, non-cancellable event is dispatche
	todo: Lifecycle Methods or functions instead of "controller()"
	todo: support for custom tag names "<x-CTAButton>"
	todo: error handling with event emmiters
	todo: find a good way to encapsulate CSS without explicitly adding a class
	todo: example with paths to component images assets
	todo: Warning on missing component
	todo: Default dehavior on missing components
	todo: Refer to "elements" with src instead of single element
	todo: Test how to remove dependency on jQuery (real problem is jQuery versions)
	todo: "build number" scheme for invalidating/breaking the component cache


	done: Cache/Memoize external components into the local storage for "sync" execution once cached
	done: Clear cache on ctrl-f5 and ctrl-r
*/
(function() {

	$("body head").append("<style>component {display: none;}</style>")

	var domain = new Domain();
	var cachingKeyPrefix = "componentSource6-";
	var lastCacheFlushTimestampKey = "component-lastCacheFlushTimestamp"
	domain.controllers = {};

	function invalidateCache() {
		if (localStorage) {
			localStorage[lastCacheFlushTimestampKey] = Date.now();
		}
	}

	$(document).on("keydown", function(e) {
		if (
			// ctrl-f5
			((e.ctrlKey || e.metaKey) && e.keyCode == 116) ||
			// ctrl-r
			((e.ctrlKey || e.metaKey) && e.keyCode == 82)
			) {
			//console.log("Cache invalidated!");
			invalidateCache();
		}
	});

	window.controller = function(name, handler) {
		domain.controllers[name] = handler;
	};

	// figure out how to inject the model
	$(function() {
		domain.ready(this, model);
	});

	function Domain() {
		// The list of registered components
		this.components = {}
	}

	function Component(el) {
		var component = this;
		component.isReady = false;
		component.init(el);
	}

	Component.prototype.init = function (el, fromSource) {
		var timestamp;
		var maxAge;
		var component = this;
		var path;
		var cachedComponentFound;
		var lastCacheFlushTimestamp = parseInt(localStorage[lastCacheFlushTimestampKey] || 0);

		component.el = el;
		component.src = $(el).attr("src");
		component.name = $(el).attr("name");

		var prefix = cachingKeyPrefix + component.name;

		function loadFromSource(source, maxAge) {
			if (localStorage) {
				localStorage[prefix] = source;
				localStorage[prefix + "-timestamp"] = Date.now();
				if (typeof(maxAge) != "undefined") {
					localStorage[prefix + "-maxAge"] = maxAge;
				}
			}
			var loadedFragment = $(source.trim());
			var importedComponent = loadedFragment.find('element[name="' + component.name + '"]');
			$(component.el).replaceWith(importedComponent);
			component.init(importedComponent, true);
		}
		if (component.src) {
			cachedComponentFound = false;
			// If localStorage is available and key is found
			if (localStorage) {
				cachedComponentFound = localStorage[prefix];
				if (cachedComponentFound) {
					timestamp = parseInt(localStorage[prefix + "-timestamp"] || 0);
					maxAge = parseInt(localStorage[prefix + "-maxAge"] || 0);
					// Clear the cached component is stable
					if (
						!maxAge ||
						(timestamp + maxAge < Date.now()) ||
						(timestamp < lastCacheFlushTimestamp)
						) {
						cachedComponentFound = localStorage[prefix] = null;
					}
				}
			}

			if (cachedComponentFound) {
				loadFromSource(cachedComponentFound);
			} else {
				path = component.src;
				//console.log("path", path);
				$.get(path, function(response, status, xhr) {
					if (status == "error") {
						var msg = "Sorry but there was an error: ";
						$("#error").html(msg + xhr.status + " " + xhr.statusText);
					}
					var cacheControl = xhr.getResponseHeader("Cache-Control");
					var maxAge, splitMaxAge;
					if (cacheControl) {
						splitMaxAge = cacheControl.split("=");
						if (splitMaxAge[0] == "max-age") {
							maxAge = parseInt(splitMaxAge[1]);
						}
					}
					loadFromSource(response, maxAge);
				})
			}
		} else {
			// Get the elements template
			component.template = $(component.el).find("template").first();
			component.scripts = $(component.el).find("script").first();
			component.controller = function () {
				// this allow the execution of controllers that we're loaded async or from cache
				var controller = domain.controllers[component.name];
				if (controller) return controller.apply(this, arguments);
			};
			component.styles = $(component.el).find("style");

			if (fromSource) {
				/*
				Inject scripts and styles if it was loaded from source instad of inline the html page
				*/
				// Put the current element in a global var to be catched later
				// by the "controller()" helper function
				$("<script>window.ControllerInScope = '" + component.name + "';</script>").appendTo("html > head");
				component.el.appendTo("html > head");
			}

//			console.log("Component is ready: " + component.name, el);
			component.isReady = true;
//			console.log("triggering ready");
			$(component).trigger("ready");
		}
	};

	Component.prototype.render = function (el, model, domain) {
		var component = this;
		// console.log("rendering: " + component.name);
		//console.log("Applying component : ", component.name);
		// Create a copy of the template for rendering
		if (component.isReady) {
			var $newElement = component.template.clone();

			var $newContent = $newElement.contents();

			// Keep a reference to the old element
			var $oldElement = $(el);

	//			var $oldContent = $oldElement.children();
			var $oldContent = $oldElement.contents();

			// Automatically add the class name of the component
			$oldElement.addClass(component.name);

			//todo: remove the "is" ttr is temporary ... fix this
			$oldElement.attr("is", null);

			// Replace the "content" tag with the old elements
			$oldElement.empty();
			$oldElement.append($newContent);
			$oldElement.find("content").replaceWith($oldContent);

			// Call the controller
			// if (component.name == "repeater") debugger;
			if (component.controller) {
				component.controller.call($oldElement, model, domain);
			}

			// render any unrendered tags
			domain.render(el, model);
		} else {
//			console.log("Posponing");
			// Pospone the elements rendering
			$(component).on("ready", function () {
//				console.log("Re-start");
				component.render(el, model, domain);
			})
		}
		// Render sub templates

	}

	Domain.prototype.register = function (el) {
		var domain = this;
		var component = new Component(el);
		domain.components[component.name] = component;
	}

	Domain.prototype.registerAll = function (el) {
		var domain = this;
		//console.log("Loading component domain from here : ", el);
		$(el).find("element").each(function () {
			domain.register(this);
		})
	}

	Domain.prototype.render = function (el, model) {
		var domain = this;

		// Iterate through each component instances
		var firstLevelElements = $(el).find("[is]")
			.filter(function () {
				return $(this).parents('[is]').length === 0;
			});
			firstLevelElements.each(renderComponent);

		function renderComponent() {
			var name = $(this).attr("is");
			var component = domain.components[name];
			if (component) {
				component.render(this, model, domain);
			} else {
				// todo: add suport for event emmiter
				console.warn("Missing component : " + name);
			}
		}
	}

	Domain.prototype.ready = function (el, model) {
		var domain = this;
		//todo: find a better name than registerAll
		domain.registerAll(el, model);
		domain.render(el, model);
	}

})()