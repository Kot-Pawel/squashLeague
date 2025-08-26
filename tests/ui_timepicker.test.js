/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

let form, dateInput;
const scriptPath = path.resolve(__dirname, '../ui_timepicker.js');

beforeAll(() => {
  global.alert = jest.fn();
});

afterAll(() => {
  global.alert.mockRestore();
});

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
<form id="availability-form">
  <input id="available-dates" type="text" />
  <button type="submit">Submit</button>
</form>
`;
  form = document.getElementById('availability-form');
  dateInput = document.getElementById('available-dates');
  global.alert.mockClear();
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  eval(scriptContent);
  document.dispatchEvent(new Event('DOMContentLoaded'));
});

describe('ui_timepicker.js', () => {
  it('creates time pickers for selected dates', () => {
    dateInput.value = '2025-08-26,2025-08-27';
    dateInput.dispatchEvent(new Event('change'));
    const timeSlotsContainer = document.getElementById('time-slots-container');
    expect(timeSlotsContainer).not.toBeNull();
    expect(timeSlotsContainer.querySelectorAll('div[data-date]').length).toBe(2);
  });

  it('adds and removes time slots, updates hidden input', () => {
    dateInput.value = '2025-08-26';
    dateInput.dispatchEvent(new Event('change'));
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const wrapper = timeSlotsContainer.querySelector('div[data-date]');
    const start = wrapper.querySelector('.start-time');
    const end = wrapper.querySelector('.end-time');
    start.value = '10:00';
    end.value = '12:00';
    wrapper.querySelector('.btn-add-slot').click();

    // Check slot added
    expect(wrapper.querySelector('.slots-list span').textContent).toContain('10:00 - 12:00');
    // Check hidden input updated
    const hidden = form.querySelector('input[name="date-times-json"]');
    expect(hidden.value).toContain('10:00 - 12:00');

    // Remove slot
    wrapper.querySelector('.btn-remove-slot').click();
    expect(wrapper.querySelector('.slots-list').children.length).toBe(0);
  });

  it('prevents form submission if no slots', () => {
    dateInput.value = '2025-08-26';
    dateInput.dispatchEvent(new Event('change'));
    // Dispatch submit event directly
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Please add at least one time slot'));
  });

  it('allows form submission if slots exist', () => {
    dateInput.value = '2025-08-26';
    dateInput.dispatchEvent(new Event('change'));
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const wrapper = timeSlotsContainer.querySelector('div[data-date]');
    wrapper.querySelector('.start-time').value = '09:00';
    wrapper.querySelector('.end-time').value = '10:00';
    wrapper.querySelector('.btn-add-slot').click();

    // Mock preventDefault to check if it's called
    const event = new Event('submit', { bubbles: true, cancelable: true });
    event.preventDefault = jest.fn();
    form.dispatchEvent(event);
    // Should not call alert, and should not call preventDefault
    expect(global.alert).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});