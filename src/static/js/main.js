// Main application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all interactive elements
    initForms();
    initDeleteButtons();
    initCurrencyFormatting();
});

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
    const deleteButtons = document.querySelectorAll('.btn-delete');

    deleteButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();

            const url = this.getAttribute('href');
            const confirmMessage = this.dataset.confirmMessage || 'Are you sure you want to delete this item?';

            if (confirm(confirmMessage)) {
                try {
                    const response = await fetch(url, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }

                    // Show success message
                    showMessage('Success!', 'Item deleted successfully.', 'success');

                    // Remove the item from the DOM or reload the page
                    const itemElement = this.closest('.item');
                    if (itemElement) {
                        itemElement.remove();
                    } else {
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showMessage('Error', error.message, 'error');
                }
            }
        });
    });
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
