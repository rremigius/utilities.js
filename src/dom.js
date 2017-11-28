(function() {
	var DOM = {};

	DOM.getSelectedText = function() {
		var txt = '';
		if (window.getSelection)
		{
			txt = ""+window.getSelection();
		}
		else if (document.getSelection)
		{
			txt = ""+document.getSelection();
		}
		else if (document.selection)
		{
			txt = ""+document.selection.createRange().text;
		}
		else return;

		return txt.length > 0 ? txt : undefined;
	};

	module.exports = DOM;
})();
