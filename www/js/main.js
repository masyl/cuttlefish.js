(function() {


	var cuttlefish = new Cuttlefish();

	var model = {
		someModel: "This is the model!"
	};

	// figure out how to inject the model
	$(function() {
		cuttlefish.ready(this, model);
		bindEditables();
	});


	function bindEditables() {
		var $editor = $("<div class='editor'><div id='editorContent'></div><div class='buttons'><button class='btn save'>save</button><button class='btn cancel'>cancel</button></div></div>").appendTo("html");
	    var editor = ace.edit("editorContent");
	    editor.setTheme("ace/theme/monokai");
	    editor.getSession().setMode("ace/mode/html");

		function onEdit(e) {
			e.preventDefault();
			var id = $(this)[0].id;
			$editor.data("partial-id", id);
			var partialSelector =  "#" + id;
			var headers = {partial: partialSelector};
			var options = {
				url:"/index.html",
				headers: headers
			};
			function onDone(data, status, req) {
			    editor.setValue(data);
			    editor.gotoLine(0);
			    $editor.fadeIn();
			}
			$.ajax(options).done(onDone)

		}
		function onSave(e) {
			console.log("onSave");
			e.preventDefault();
			var content = editor.getValue();
			var id = $editor.data("partial-id");
			var partialSelector =  "#" + id;
			var headers = {partial: partialSelector};
			var options = {
				type: "POST",
				url:"/index.html",
				headers: headers,
				data: content
			};
			function onDone(data, status, req) {
			    editor.setValue("");
			    $(partialSelector).replaceWith(data);
			    $editor.fadeOut();
				console.log("data: ", data);
			}
			$.ajax(options).done(onDone)
		}
		function onCancel(e) {
			e.preventDefault();
		    editor.setValue("");
		    $editor.fadeOut();
		}

		$("body").on("click", ".is-editable", onEdit)
		$editor.on("click", ".cancel", onCancel);
		$editor.on("click", ".save", onSave);
	}

})();