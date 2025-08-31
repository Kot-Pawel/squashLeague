// CDN for flatpickr time plugin: https://cdn.jsdelivr.net/npm/flatpickr/dist/plugins/rangePlugin.js
// CDN for timepicker: https://cdn.jsdelivr.net/npm/flatpickr/dist/plugins/timePicker/timePicker.min.js
// CDN for timepicker CSS: https://cdn.jsdelivr.net/npm/flatpickr/dist/plugins/timePicker/timePicker.min.css

// This script dynamically creates time pickers for each selected date in the availability form.
document.addEventListener('DOMContentLoaded', function() {

  const dateInput = document.getElementById('available-dates');
  const timeSlotsContainer = document.createElement('div');
  timeSlotsContainer.id = 'time-slots-container';
  timeSlotsContainer.className = 'mb-3';
  const form = document.getElementById('availability-form');
  // Prevent attaching listeners multiple times
  if (!form || form.dataset.listenersAttached === 'true') return;
  form.dataset.listenersAttached = 'true';
  form.insertBefore(timeSlotsContainer, form.querySelector('button[type="submit"]'));

  function createTimePicker(dateStr) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-2';
    wrapper.dataset.date = dateStr;
    wrapper.innerHTML = `
      <label class="form-label">Available hours for <b>${dateStr}</b>:</label>
      <div class="input-group mb-1">
  <input type="time" class="form-control start-time">
        <span class="input-group-text">to</span>
  <input type="time" class="form-control end-time">
        <button type="button" class="btn btn-outline-secondary btn-add-slot">+</button>
      </div>
      <div class="slots-list"></div>
    `;
    return wrapper;
  }

  function updateTimePickers(selectedDates) {
    timeSlotsContainer.innerHTML = '';
    selectedDates.forEach(dateStr => {
      const picker = createTimePicker(dateStr);
      timeSlotsContainer.appendChild(picker);
    });
    updateHiddenInput();
  }

  function updateHiddenInput() {
    const all = [];
    timeSlotsContainer.querySelectorAll('div[data-date]').forEach(wrapper => {
      const date = wrapper.dataset.date;
      const slots = Array.from(wrapper.querySelectorAll('.slots-list span')).map(span => span.textContent.trim());
      all.push({ date, times: slots });
    });
    let hidden = form.querySelector('input[name="date-times-json"]');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'date-times-json';
      form.appendChild(hidden);
    }
    hidden.value = JSON.stringify(all);
  }

  // Listen for changes in the date picker
  dateInput.addEventListener('change', function() {
    const selectedDates = dateInput.value
      ? dateInput.value.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    updateTimePickers(selectedDates);
  });

  // Add slot logic
  timeSlotsContainer.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-add-slot')) {
      const group = e.target.closest('.input-group');
      const wrapper = e.target.closest('div[data-date]');
      const start = group.querySelector('.start-time').value;
      const end = group.querySelector('.end-time').value;
      if (start && end && start < end) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'd-flex align-items-center mb-1';
        slotDiv.innerHTML = `<span class="me-2">${start} - ${end}</span><button type="button" class="btn btn-sm btn-danger btn-remove-slot">Remove</button>`;
        wrapper.querySelector('.slots-list').appendChild(slotDiv);
        group.querySelector('.start-time').value = '';
        group.querySelector('.end-time').value = '';
        updateHiddenInput();
      }
    } else if (e.target.classList.contains('btn-remove-slot')) {
      e.target.parentElement.remove();
      updateHiddenInput();
    }
  });

  // On form submit, collect all date/time slots and store in a hidden input
  form.addEventListener('submit', function(e) {
    // Validation only, hidden input is already up to date
    let valid = true;
    let firstInvalidDate = null;
    timeSlotsContainer.querySelectorAll('div[data-date]').forEach(wrapper => {
      const date = wrapper.dataset.date;
      const slots = Array.from(wrapper.querySelectorAll('.slots-list span')).map(span => span.textContent.trim());
      if (slots.length === 0) {
        valid = false;
        if (!firstInvalidDate) firstInvalidDate = date;
      }
    });
    if (!valid) {
      e.preventDefault();
      alert('Please add at least one time slot for ' + firstInvalidDate + '.');
      return false;
    }
  });
});
