(function () {
  function bindDocumentForm(form) {
    var table = form.querySelector('[data-line-table] tbody');
    var template = form.querySelector('[data-line-template]');
    var addButton = form.querySelector('[data-add-line]');
    if (!table || !template || !addButton) return;

    addButton.addEventListener('click', function () {
      table.appendChild(template.content.cloneNode(true));
    });

    form.addEventListener('click', function (event) {
      var button = event.target.closest('[data-remove-line]');
      if (!button) return;
      var rows = table.querySelectorAll('tr');
      if (rows.length <= 1) {
        var rowInputs = rows[0].querySelectorAll('input, select');
        rowInputs.forEach(function (input) {
          input.value = '';
        });
        return;
      }
      button.closest('tr').remove();
    });
  }

  document.querySelectorAll('[data-document-form]').forEach(bindDocumentForm);
})();
