// Debug script to check delete button functionality
console.log('Debug script loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');

    // Check if delete buttons exist
    const deleteButtons = document.querySelectorAll('.btn-delete');
    console.log(`Found ${deleteButtons.length} delete buttons`);

    // Check each delete button
    deleteButtons.forEach((button, index) => {
        console.log(`Button ${index + 1}:`);
        console.log(`  href: ${button.getAttribute('href')}`);
        console.log(`  confirm message: ${button.dataset.confirmMessage || 'None'}`);

        // Check if the button can find its closest '.item' element
        const itemElement = button.closest('.item');
        if (itemElement) {
            console.log(`  Found closest .item element: ${itemElement.tagName}`);
        } else {
            console.log(`  No closest .item element found!`);
        }

        // Add a test click handler
        button.addEventListener('click', function(e) {
            console.log(`Button ${index + 1} clicked`);
            e.preventDefault(); // Prevent the actual delete operation

            // Test finding the closest '.item' element again
            const itemElement = this.closest('.item');
            if (itemElement) {
                console.log(`  Found closest .item element: ${itemElement.tagName}`);
                console.log(`  Would remove this element from the DOM`);
            } else {
                console.log(`  No closest .item element found!`);
                console.log(`  Would redirect to /accounts after 2 seconds`);
            }
        });
    });
});
