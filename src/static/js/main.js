// Main application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all interactive elements
    initForms();
    initDeleteButtons();
    initCurrencyFormatting();

    // Add a manual check after a short delay to ensure everything is initialized
    setTimeout(checkDeleteButtons, 500);
});

// Function to check if delete buttons are properly initialized
function checkDeleteButtons() {
    console.log('Running final check for delete buttons...');

    // Check for any delete buttons that might have been missed
    const allButtons = document.querySelectorAll('button.btn-danger');
    const allForms = document.querySelectorAll('form');

    console.log(`Final check found ${allButtons.length} danger buttons`);
    console.log(`Final check found ${allForms.length} forms`);

    // Check if any forms have the method="POST" and a hidden _method=DELETE field
    let deleteFormCount = 0;
    allForms.forEach((form) => {
        const methodInput = form.querySelector('input[name="_method"][value="DELETE"]');
        if (form.method.toUpperCase() === 'POST' && methodInput) {
            deleteFormCount++;
            console.log(`Found a form with method="POST" and _method=DELETE:`);
            console.log(`  Action: ${form.action}`);
            console.log(`  Has delete button: ${form.querySelector('.btn-danger') ? 'Yes' : 'No'}`);

            // Check if this form's button has a click handler
            const button = form.querySelector('.btn-danger');
            if (button) {
                console.log(`  Button has click handler: ${button.onclick !== null || button.getAttribute('data-initialized') === 'true' ? 'Yes' : 'No'}`);

                // If the button doesn't have a click handler, add one
                if (button.onclick === null && button.getAttribute('data-initialized') !== 'true') {
                    console.log('  Adding click handler to missed delete button');
                    button.setAttribute('data-initialized', 'true');

                    button.addEventListener('click', async function(e) {
                        e.preventDefault();

                        const form = this.closest('form');
                        const url = form ? form.action : null;

                        console.log(`Manual delete button clicked: Form button with action: ${url}`);

                        if (!url) {
                            console.error('No URL found for delete operation');
                            showMessage('Error', 'No URL found for delete operation', 'error');
                            return;
                        }

                        const confirmMessage = 'Are you sure you want to delete this item?';

                        if (confirm(confirmMessage)) {
                            try {
                                console.log(`Sending DELETE request to: ${url}`);
                                const response = await fetch(url, {
                                    method: 'DELETE',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                });

                                console.log(`Response status: ${response.status}`);
                                if (!response.ok) {
                                    throw new Error(`HTTP error! Status: ${response.status}`);
                                }

                                // Show success message
                                showMessage('Success!', 'Item deleted successfully.', 'success');
                                console.log('Delete operation successful');

                                // Try to find the item element to remove
                                const element = form;
                                let itemElement = element.closest('.item');
                                console.log(`Found item element: ${itemElement ? 'Yes' : 'No'}`);

                                if (itemElement) {
                                    // Remove the item from the DOM
                                    console.log('Removing item from DOM');
                                    itemElement.remove();
                                } else {
                                    // If we can't find the item element, try to find it by other means
                                    const row = element.closest('tr');
                                    if (row) {
                                        console.log('Found table row, removing it');
                                        row.remove();
                                    } else {
                                        console.log('Could not find item element or row, redirecting to accounts page');
                                        setTimeout(() => {
                                            window.location.href = '/accounts';
                                        }, 2000);
                                    }
                                }
                            } catch (error) {
                                console.error('Error:', error);
                                showMessage('Error', error.message, 'error');
                            }
                        }
                    });
                }
            }
        }
    });

    console.log(`Final check found ${deleteFormCount} forms with method="POST" and _method=DELETE`);
}

// Initialize form submissions with AJAX
function initForms() {
    const forms = document.querySelectorAll('form[data-ajax="true"]');

    forms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            try {
                const formData = new FormData(form);
                const jsonData = {};

                formData.forEach((value, key) => {
                    // Handle special cases like account_id which should be a UUID
                    if (key === 'account_id' && value) {
                        jsonData[key] = value;
                    }
                    // Handle numeric values
                    else if (key === 'balance' || key === 'amount') {
                        jsonData[key] = parseFloat(value);
                    }
                    // Handle empty values
                    else if (value === '') {
                        jsonData[key] = null;
                    }
                    // Handle all other values
                    else {
                        jsonData[key] = value;
                    }
                });

                const response = await fetch(form.action, {
                    method: form.method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(jsonData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const result = await response.json();

                // Show success message
                showMessage('Success!', 'Operation completed successfully.', 'success');

                // Redirect if specified
                const redirectUrl = form.dataset.redirectUrl;
                if (redirectUrl) {
                    setTimeout(() => {
                        window.location.href = redirectUrl;
                    }, 1000);
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('Error', error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    });
}

// Initialize delete buttons with confirmation
function initDeleteButtons() {
    console.log('Initializing delete buttons');

    // Log all elements with class 'btn'
    const allButtons = document.querySelectorAll('.btn');
    console.log(`Found ${allButtons.length} buttons with class 'btn'`);

    // Log all elements with class 'btn-danger'
    const dangerButtons = document.querySelectorAll('.btn-danger');
    console.log(`Found ${dangerButtons.length} buttons with class 'btn-danger'`);

    // Log all anchor tags
    const allAnchors = document.querySelectorAll('a');
    console.log(`Found ${allAnchors.length} anchor tags`);

    // Try to find delete buttons with a more specific selector
    const deleteButtons = document.querySelectorAll('a.btn-delete');
    console.log(`Found ${deleteButtons.length} delete buttons with selector 'a.btn-delete'`);

    // Try with a different selector for form-based delete buttons
    const deleteFormButtons = document.querySelectorAll('form.inline-form button.btn-danger');
    console.log(`Found ${deleteFormButtons.length} delete buttons with selector 'form.inline-form button.btn-danger'`);

    // Try with a more general selector for form-based delete buttons
    const allFormButtons = document.querySelectorAll('form button.btn-danger');
    console.log(`Found ${allFormButtons.length} delete buttons with selector 'form button.btn-danger'`);

    // Log all forms with class 'inline-form'
    const inlineForms = document.querySelectorAll('form.inline-form');
    console.log(`Found ${inlineForms.length} forms with class 'inline-form'`);

    // Log all forms
    const allForms = document.querySelectorAll('form');
    console.log(`Found ${allForms.length} forms`);

    // Log details about each form
    allForms.forEach((form, index) => {
        console.log(`Form ${index + 1}:`);
        console.log(`  Action: ${form.action}`);
        console.log(`  Method: ${form.method}`);
        console.log(`  Classes: ${form.className}`);
        console.log(`  Has delete button: ${form.querySelector('.btn-danger') ? 'Yes' : 'No'}`);
    });

    // Log the HTML content of the page for debugging
    console.log('HTML content of the page:');
    console.log(document.body.innerHTML);

    // Use the appropriate selector based on what's available
    let buttonsToUse = [];
    if (deleteButtons.length > 0) {
        buttonsToUse = deleteButtons;
        console.log(`Using ${buttonsToUse.length} anchor-based delete buttons`);
    } else if (allFormButtons.length > 0) {
        buttonsToUse = allFormButtons;
        console.log(`Using ${buttonsToUse.length} form-based delete buttons (general selector)`);
    } else if (deleteFormButtons.length > 0) {
        buttonsToUse = deleteFormButtons;
        console.log(`Using ${buttonsToUse.length} form-based delete buttons (specific selector)`);
    } else {
        buttonsToUse = dangerButtons;
        console.log(`Using ${buttonsToUse.length} general danger buttons as fallback`);
    }

    buttonsToUse.forEach((button, index) => {
        // Determine if this is a form button or an anchor
        const isFormButton = button.tagName === 'BUTTON';
        const form = isFormButton ? button.closest('form') : null;
        const url = isFormButton ? (form ? form.action : null) : button.getAttribute('href');

        console.log(`Setting up delete button ${index + 1}: ${isFormButton ? 'Form button with action: ' + url : 'Anchor with href: ' + url}`);

        button.addEventListener('click', async function(e) {
            e.preventDefault();

            // Get the URL from either the form action or the anchor href
            const isFormButton = this.tagName === 'BUTTON';
            const form = isFormButton ? this.closest('form') : null;
            const url = isFormButton ? (form ? form.action : null) : this.getAttribute('href');

            console.log(`Delete button clicked: ${isFormButton ? 'Form button with action: ' + url : 'Anchor with href: ' + url}`);

            if (!url) {
                console.error('No URL found for delete operation');
                showMessage('Error', 'No URL found for delete operation', 'error');
                return;
            }

            const confirmMessage = this.dataset.confirmMessage ||
                                  (form ? form.getAttribute('onsubmit') ? 'Are you sure you want to delete this item?' : 'Are you sure you want to delete this item?' : 'Are you sure you want to delete this item?');

            if (confirm(confirmMessage)) {
                try {
                    console.log(`Sending DELETE request to: ${url}`);
                    const response = await fetch(url, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log(`Response status: ${response.status}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }

                    // Show success message
                    showMessage('Success!', 'Item deleted successfully.', 'success');
                    console.log('Delete operation successful');

                    // Try to find the item element to remove
                    const element = isFormButton ? form : this;
                    let itemElement = element.closest('.item');
                    console.log(`Found item element: ${itemElement ? 'Yes' : 'No'}`);

                    if (itemElement) {
                        // Remove the item from the DOM
                        console.log('Removing item from DOM');
                        itemElement.remove();
                    } else {
                        // If we can't find the item element, try to find it by other means
                        // For example, if we're on the accounts page, we might be in a table row
                        const row = element.closest('tr');
                        if (row) {
                            console.log('Found table row, removing it');
                            row.remove();
                        } else {
                            console.log('Could not find item element or row, redirecting to accounts page');
                            // Increase timeout to ensure server has time to process the deletion
                            // and give user time to see the success message
                            setTimeout(() => {
                                window.location.href = '/accounts';
                            }, 2000);
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showMessage('Error', error.message, 'error');
                }
            }
        });
    });

    // Re-initialize delete buttons when the DOM changes
    // This ensures that dynamically added delete buttons also work
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                // Try to find new delete buttons with all selectors
                const newDeleteButtons = document.querySelectorAll('a.btn-delete:not([data-initialized])');
                const newAllFormButtons = document.querySelectorAll('form button.btn-danger:not([data-initialized])');
                const newFormButtons = document.querySelectorAll('form.inline-form button.btn-danger:not([data-initialized])');
                const newDangerButtons = document.querySelectorAll('.btn-danger:not([data-initialized])');

                console.log(`Found ${newDeleteButtons.length} new anchor-based delete buttons`);
                console.log(`Found ${newAllFormButtons.length} new form-based delete buttons (general selector)`);
                console.log(`Found ${newFormButtons.length} new form-based delete buttons (specific selector)`);
                console.log(`Found ${newDangerButtons.length} new general danger buttons`);

                // Log details about any new forms
                const newForms = document.querySelectorAll('form:not([data-checked])');
                if (newForms.length > 0) {
                    console.log(`Found ${newForms.length} new forms`);
                    newForms.forEach((form, index) => {
                        form.setAttribute('data-checked', 'true');
                        console.log(`New form ${index + 1}:`);
                        console.log(`  Action: ${form.action}`);
                        console.log(`  Method: ${form.method}`);
                        console.log(`  Classes: ${form.className}`);
                        console.log(`  Has delete button: ${form.querySelector('.btn-danger') ? 'Yes' : 'No'}`);
                    });
                }

                // Use the appropriate selector based on what's available
                let newButtonsToUse = [];
                if (newDeleteButtons.length > 0) {
                    newButtonsToUse = newDeleteButtons;
                    console.log(`Using ${newButtonsToUse.length} new anchor-based delete buttons`);
                } else if (newAllFormButtons.length > 0) {
                    newButtonsToUse = newAllFormButtons;
                    console.log(`Using ${newButtonsToUse.length} new form-based delete buttons (general selector)`);
                } else if (newFormButtons.length > 0) {
                    newButtonsToUse = newFormButtons;
                    console.log(`Using ${newButtonsToUse.length} new form-based delete buttons (specific selector)`);
                } else if (newDangerButtons.length > 0) {
                    newButtonsToUse = newDangerButtons;
                    console.log(`Using ${newButtonsToUse.length} new general danger buttons as fallback`);
                }

                if (newButtonsToUse.length) {
                    console.log(`Setting up ${newButtonsToUse.length} new delete buttons`);
                    newButtonsToUse.forEach((button) => {
                        button.setAttribute('data-initialized', 'true');

                        // Determine if this is a form button or an anchor
                        const isFormButton = button.tagName === 'BUTTON';
                        const form = isFormButton ? button.closest('form') : null;
                        const url = isFormButton ? (form ? form.action : null) : button.getAttribute('href');

                        console.log(`Setting up new delete button: ${isFormButton ? 'Form button with action: ' + url : 'Anchor with href: ' + url}`);

                        button.addEventListener('click', async function(e) {
                            e.preventDefault();

                            // Get the URL from either the form action or the anchor href
                            const isFormButton = this.tagName === 'BUTTON';
                            const form = isFormButton ? this.closest('form') : null;
                            const url = isFormButton ? (form ? form.action : null) : this.getAttribute('href');

                            console.log(`New delete button clicked: ${isFormButton ? 'Form button with action: ' + url : 'Anchor with href: ' + url}`);

                            if (!url) {
                                console.error('No URL found for delete operation');
                                showMessage('Error', 'No URL found for delete operation', 'error');
                                return;
                            }

                            const confirmMessage = this.dataset.confirmMessage ||
                                                  (form ? form.getAttribute('onsubmit') ? 'Are you sure you want to delete this item?' : 'Are you sure you want to delete this item?' : 'Are you sure you want to delete this item?');

                            if (confirm(confirmMessage)) {
                                try {
                                    console.log(`Sending DELETE request to: ${url}`);
                                    const response = await fetch(url, {
                                        method: 'DELETE',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        }
                                    });

                                    console.log(`Response status: ${response.status}`);
                                    if (!response.ok) {
                                        throw new Error(`HTTP error! Status: ${response.status}`);
                                    }

                                    // Show success message
                                    showMessage('Success!', 'Item deleted successfully.', 'success');
                                    console.log('Delete operation successful');

                                    // Try to find the item element to remove
                                    const element = isFormButton ? form : this;
                                    let itemElement = element.closest('.item');
                                    console.log(`Found item element: ${itemElement ? 'Yes' : 'No'}`);

                                    if (itemElement) {
                                        // Remove the item from the DOM
                                        console.log('Removing item from DOM');
                                        itemElement.remove();
                                    } else {
                                        // If we can't find the item element, try to find it by other means
                                        // For example, if we're on the accounts page, we might be in a table row
                                        const row = element.closest('tr');
                                        if (row) {
                                            console.log('Found table row, removing it');
                                            row.remove();
                                        } else {
                                            console.log('Could not find item element or row, redirecting to accounts page');
                                            // Increase timeout to ensure server has time to process the deletion
                                            // and give user time to see the success message
                                            setTimeout(() => {
                                                window.location.href = '/accounts';
                                            }, 2000);
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error:', error);
                                    showMessage('Error', error.message, 'error');
                                }
                            }
                        });
                    });
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Format currency values
function initCurrencyFormatting() {
    const currencyElements = document.querySelectorAll('.currency');

    currencyElements.forEach(element => {
        const value = parseFloat(element.textContent);
        const currency = element.dataset.currency || 'USD';

        if (!isNaN(value)) {
            element.textContent = formatCurrency(value, currency);

            // Add color class based on value
            if (value > 0) {
                element.classList.add('positive');
            } else if (value < 0) {
                element.classList.add('negative');
            }
        }
    });
}

// Format a number as currency
function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(value);
}

// Show a message to the user
function showMessage(title, message, type = 'info') {
    // Check if we already have a message container
    let messageContainer = document.getElementById('message-container');

    if (!messageContainer) {
        // Create a new message container
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '20px';
        messageContainer.style.right = '20px';
        messageContainer.style.zIndex = '1000';
        document.body.appendChild(messageContainer);
    }

    // Create the message element
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.style.backgroundColor = type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db';
    messageElement.style.color = 'white';
    messageElement.style.padding = '15px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.marginBottom = '10px';
    messageElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    messageElement.style.transition = 'opacity 0.5s';

    // Add the title and message
    const titleElement = document.createElement('h4');
    titleElement.style.margin = '0 0 5px 0';
    titleElement.textContent = title;

    const messageText = document.createElement('p');
    messageText.style.margin = '0';
    messageText.textContent = message;

    messageElement.appendChild(titleElement);
    messageElement.appendChild(messageText);

    // Add the message to the container
    messageContainer.appendChild(messageElement);

    // Remove the message after 5 seconds
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageContainer.removeChild(messageElement);
        }, 500);
    }, 5000);
}
