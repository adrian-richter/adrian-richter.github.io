const projectForm = document.querySelector('#project-form');

if (projectForm) {
  const serviceInputs = [...projectForm.querySelectorAll('[data-service]')];
  const conditionalSections = [...projectForm.querySelectorAll('[data-conditional]')];
  const serviceError = projectForm.querySelector('#service-error');
  const fileInput = projectForm.querySelector('#attachment');
  const fileHint = projectForm.querySelector('#file-hint');
  const submitButton = projectForm.querySelector('.form-submit');

  const updateConditionalSections = () => {
    const selectedServices = new Set(
      serviceInputs.filter((input) => input.checked).map((input) => input.dataset.service)
    );

    conditionalSections.forEach((section) => {
      const triggers = section.dataset.conditional.split(' ');
      const isVisible = triggers.some((trigger) => selectedServices.has(trigger));
      section.hidden = !isVisible;
      section.querySelectorAll('input, select, textarea').forEach((field) => {
        field.disabled = !isVisible;
      });
      if (!isVisible) {
        section.querySelectorAll('.selection-error').forEach((error) => error.classList.remove('is-visible'));
      }
    });
  };

  const validateChoiceGroup = (name, shouldValidate) => {
    const inputs = [...projectForm.querySelectorAll(`[name="${name}"]`)];
    const error = projectForm.querySelector(`[data-group-error="${name}"]`);
    const isValid = !shouldValidate || inputs.some((input) => input.checked);
    if (error) error.classList.toggle('is-visible', !isValid);
    return isValid;
  };

  serviceInputs.forEach((input) => {
    input.addEventListener('change', () => {
      updateConditionalSections();
      if (serviceInputs.some((service) => service.checked)) serviceError.classList.remove('is-visible');
    });
  });

  projectForm.querySelectorAll('[name="Printprodukt[]"], [name="DTF-Leistung[]"]').forEach((input) => {
    input.addEventListener('change', () => {
      const error = projectForm.querySelector(`[data-group-error="${input.name}"]`);
      if (error) error.classList.remove('is-visible');
    });
  });

  fileInput.addEventListener('change', () => {
    const totalBytes = [...fileInput.files].reduce((total, file) => total + file.size, 0);
    const overLimit = totalBytes > 10 * 1024 * 1024;
    fileInput.setCustomValidity(overLimit ? 'Die ausgewählten Dateien sind zusammen größer als 10 MB.' : '');
    fileHint.textContent = overLimit
      ? 'Die Dateien sind zusammen größer als 10 MB. Bitte Auswahl verkleinern.'
      : 'PDF, DOC, DOCX, PNG, JPG, SVG oder ZIP · zusammen maximal 10 MB';
  });

  projectForm.addEventListener('submit', (event) => {
    const chosen = new Set(
      serviceInputs.filter((input) => input.checked).map((input) => input.dataset.service)
    );
    const servicesValid = chosen.size > 0;
    const printValid = validateChoiceGroup('Printprodukt[]', chosen.has('print'));
    const textileValid = validateChoiceGroup('DTF-Leistung[]', chosen.has('textile'));

    serviceError.classList.toggle('is-visible', !servicesValid);

    if (!servicesValid || !printValid || !textileValid || !projectForm.checkValidity()) {
      event.preventDefault();
      const firstError = projectForm.querySelector('.selection-error.is-visible');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        projectForm.reportValidity();
      }
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Wird gesendet …';
  });

  updateConditionalSections();
}
