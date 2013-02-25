(function() {


	var cuttlefish = new Cuttlefish();

	var model = {
		someModel: "This is the model!"
	};

	// figure out how to inject the model
	$(function() {
		cuttlefish.ready(this, model);
	});




})();