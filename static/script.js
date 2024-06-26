import { Alert } from "./classes.js";

document.addEventListener("DOMContentLoaded", function () {

    // Scroll to top button function
    scrollToTop();

    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
    const dialog = document.querySelector("dialog");

    // Only run if dialog element is present
    if (dialog) {
        dialogBox(dialog);
    }

    // Select the form
    const form = document.querySelector(".budget-form");

    // Don't perform form operations unless there's a budget form
    if (!form) {
        return;
    }

    // Create new alert instance to display upon encountering errors
    const navbar = document.querySelector(".navbar");
    const warningTarget = document.querySelector(".scroll-top");
    let alert = new Alert(navbar, warningTarget);
    alert.clear();

    // Calculate the remaining funds, to spend - expense costs
    calculateRemaining();

    // Add input functionality/feedback to generated inputs (added through Jinja in templates)
    const inputs = document.querySelectorAll(".budget-form input");
    generatedInputs(inputs);

    // Enable editing for edit form
    const edit = document.querySelector("#edit");
    editForm(edit);

    // Add a max character length to budget name
    const budgetNameInput = document.querySelector(".budget-form input[name='name']");
    inputMax(budgetNameInput);

    /* Accordion */
    // https://www.w3schools.com/howto/howto_js_accordion.asp
    const accordions = document.querySelectorAll(".accordion");
    enableAccordions(accordions);

    // Select all the checkboxes
    const checkedCategories = document.querySelectorAll(".checkbox-filter");
    checkboxFilter(checkedCategories);
    
    const addButtons = document.querySelectorAll(".add");
    const created = document.querySelectorAll(".created");
    addInputs(addButtons, created);

    // Listen for the submit event
    form.addEventListener("submit", async function(event) {

        // Prevent default behavior
        event.preventDefault();

        const budgetName = document.querySelector("input[name='name']").value.trim();
        const budget = parseFloat(document.querySelector("input[name='budget']").value);
        const result = calculateResult();

        // Check if there's a budget id stored
        let budget_id = document.querySelector("input[name='id']");
        const id = budget_id ? budget_id.value : null;

        // Collect data from form inputs, returns a JSON
        let formData;
        try {
            formData = formDataCollection(budgetName, budget, result, id);
        } catch (e) {
            alert.create(e.message);
            return;
        }
        console.log(formData);

        const submitButton = document.querySelector("button[type='submit']");
        const route = submitButton.id;

        // Send a POST request to the /create view
        let request = await fetch(route, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        alert.clear();

        // Get response from server
        let response = await request.json();

        // Redirect if a url was returned, show message if not
        if (response.url) {
            window.location.href = response.url;
        } else {
            for (let msg in response) {
                alert.create(response[msg]);
                console.log("response " + response[msg]);
            }
        }

        console.log(JSON.stringify(formData));
    });
});

/* Enable accordion functionality on buttons */
/* Based on https://www.w3schools.com/howto/howto_js_accordion.asp */
function enableAccordions(buttons) {
    for (let accordion of buttons) {

        // If accordion is already open (enabled) set the max-height, otherwise it will be 0
        if (accordion.nextElementSibling.classList.contains("enabled")) {
            // accordion.nextElementSibling.style.maxHeight = "100%";
            accordion.nextElementSibling.style.maxHeight = accordion.nextElementSibling.scrollHeight + "px";
        }

        accordion.addEventListener("click", function() {
    
            // Toggle the active class on/off
            this.classList.toggle("active");
    
            // Select the item class, the sibling of accordion
            let item = this.nextElementSibling;
            let icon = this.querySelector(".accordion > .fa-solid");

            // If category is open, close it
            if (item.classList.contains("enabled")) {
                item.classList.toggle("enabled");
                icon.classList.remove("fa-angle-up");
                icon.classList.add("fa-angle-down");

                // Remove max-height to shrink element with a transition
                item.style.maxHeight = null;

            // Else open it
            } else {
                item.classList.toggle("enabled");
                icon.classList.remove("fa-angle-down");
                icon.classList.add("fa-angle-up");

                // Set max-height to grow element with a transition
                item.style.maxHeight = item.scrollHeight + "px";
            }
        });
    }
}

/* Delete inputs */
function removeInput(id) {
    const div = document.getElementById(id);
    div.classList.add("deleted");
    
    // Delay delete slightly, to allow for smooth transition
    setTimeout(() => {
        div.remove();
        calculateResult();
        calculateRemaining();
    }, 400);
    
}

/* Give feedback if expense names are the same */
function preventNameCollision(input) {
    input.addEventListener("input", function() {
        if (valueExists(input, "input[name='expense']")) {
            input.style.backgroundColor = "red";
        } else {
            input.style.backgroundColor = "";
        } 
    });
}

/* Check if an input value already exists */
function valueExists(elem, select) {
    const nodeList = document.querySelectorAll(select);
    let exists = false;

    // Check existing input fields to see if value already exists, category specific
    nodeList.forEach((node) => {
        let elemCategory = elem.parentElement.dataset.category;
        let nodeCategory = node.parentElement.dataset.category;
        let nodeValue = node.value.toLowerCase();
        let elemValue = elem.value.toLowerCase();

        if (
            nodeValue === elemValue 
            && node.dataset.inputId != elem.dataset.inputId 
            && nodeCategory === elemCategory 
            && nodeValue != "" 
            && elemValue != ""
        ) {
            exists = true;
        }
    });

    return exists;
}

/* Calculate the result of all inputs named cost */
function calculateResult() {
    const costInputs = document.querySelectorAll("input[name='cost']");
    const result = document.querySelector("#result");
    let total = 0, value;

    // For each input add value to total
    costInputs.forEach((input) => {

        // Select the input category to check if the checkbox it belongs to is enabled or disabled
        const category = input.dataset.category;
        const checkbox = document.querySelector(`input[name='${category}'].checkbox-filter`);

        value = parseFloat(input.value);
        
        // Check that the value is a number
        if (isNaN(value)) {
            value = 0;
        }

        // Only count the value if the category is checked
        if (checkbox.checked) {
            total += value;
        }
    });

    // Update result display
    result.innerHTML = total.toFixed(2);
    return total;
}

/* Calculate the money remaining if there's a spending budget provided */
function calculateRemaining() {
    const budgetSpend = document.querySelector(".budget-spend");
    const remaining = document.querySelector("#remaining");
    const result = document.querySelector("#result");

    let remainingTotal = 0;

    /* Only perform subtraction if there's a budget value */
    if (budgetSpend.value && budgetSpend.value > 0) {
        remainingTotal = parseFloat(budgetSpend.value) - parseFloat(result.innerHTML);
    }

    /* Change color if remaining is in the negative */
    if (remainingTotal < 0) {
        remaining.style.color = "red";
    } else {
        remaining.style.color = "";
    }

    remaining.innerHTML = remainingTotal.toFixed(2);
    return remainingTotal;
}

/* Update the total result as user inputs costs */
function updateResult(input) {

    // Add event listener to each cost input
    input.addEventListener("input", function() {
        calculateResult();
        calculateRemaining();
    });
}

/* Add functionality to pre-generated inputs to work the same as dynamically generated ones */
function generatedInputs(inputs) {

    // Input functionality
    inputs.forEach((input) => {          
        if (input.name === "name") {
            inputMax(input);
        }
        else if (input.name === "expense") {
            preventNameCollision(input);
            inputMax(input);
        }
        else if (input.name === "cost" || input.name === "budget") {
            updateResult(input);
        }
    });


    // Add remove function to pre-generated delete buttons
    const deleteButtons = document.querySelectorAll(".delete");
    deleteButtons.forEach((button) => {
        button.addEventListener("click", () => {
            removeInput(button.parentElement.id);
        });
    });
}

/* Toggling form fields on/off and showing/hiding elements for adding/removing fields */
function editForm(edit) {
    
    if (edit === null) {
        return;
    }
    
    // When the edit button is clicked enable or disable elements
    edit.addEventListener("click", function() {

        const form = document.querySelector(".budget-form");
        const inputs = form.querySelectorAll("input");
        const categoryForm = document.querySelector(".category-form");
        const checkboxes = categoryForm.querySelectorAll("input");

        // Inputs
        inputs.forEach((input) => {
            if (input.hasAttribute("disabled")) {
                input.removeAttribute("disabled");
            } else {
                input.setAttribute("disabled", "true");
            }
        });

        // Checkboxes
        checkboxes.forEach((checkbox) => {
            if (checkbox.hasAttribute("disabled")) {
                checkbox.removeAttribute("disabled");
            } else {
                checkbox.setAttribute("disabled", "true");
            }
        });

        // Add expense buttons
        const addButtons = document.querySelectorAll(".add");
        addButtons.forEach((addButton) => {
            addButton.classList.toggle("disabled");
        });

        // Delete inputs buttons
        const deleteButtons = document.querySelectorAll(".delete");
        deleteButtons.forEach((deleteButton) => {
            deleteButton.classList.toggle("disabled");
        });

        // Grow item container to fit elements that were previously hidden
        const items = document.querySelectorAll(".item");
        items.forEach((item) => {

            // Check if the accordion menu is active, only grow item container if true
            if (!item.previousElementSibling.classList.contains("disabled")) {
                item.style.maxHeight = item.scrollHeight + "px";
            }
        });
    });
}

/* Add and remove input fields for categories */
function addInputs(buttons, created) {

    let i;
    if (created.length > 0) {
        // Get current last id and add 1, to avoid overlapping
        i = parseInt(created[created.length - 1].id) + 1;
    } else {
        i = 0;
    }

    // Select allowed maxlength
    const maxLen = document.querySelector(".budget-form input[maxlength]").maxLength;

    for (let addButton of buttons) {
        addButton.addEventListener("click", function() {  
            
            // Create inputs and set some attribute values
            const inputExpense = document.createElement("input");
            const inputCost = document.createElement("input");
            
            inputExpense.type = "text";
            inputExpense.name = "expense";
            inputExpense.placeholder = "Expense";
            inputExpense.dataset.inputId = i;
            inputExpense.dataset.category = addButton.parentElement.dataset.id;
            inputExpense.maxLength = maxLen;

            inputCost.type = "number";
            inputCost.name = "cost";
            inputCost.placeholder = "Cost";
            inputCost.step = "0.01";
            inputCost.min = "0.01";
            inputCost.dataset.inputId = i;
            inputCost.dataset.category = addButton.parentElement.dataset.id;
            
            // Create div and append inputs
            const div = document.createElement("div");            
            div.dataset.category = addButton.parentElement.dataset.id;
            div.id = i;
            div.classList.add("created");
            
            div.appendChild(inputExpense);
            div.appendChild(inputCost);
            
            // Add a button to remove inputs
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
            removeButton.classList.add("delete");
            removeButton.addEventListener("click", () => {
                removeInput(div.id);
            });
            
            div.appendChild(removeButton);
            
            // Add inputs to correct category, parent of current "add expense" button, the
            // container inside the accordion
            addButton.parentElement.appendChild(div);
            
            // Add event listeners for inputs to provide more feedback
            preventNameCollision(inputExpense);
            updateResult(inputCost);
            inputMax(inputExpense);
    
            // Increase the size of the container to fit newly created element
            addButton.parentElement.style.maxHeight = addButton.parentElement.scrollHeight + "px";

            // Increment i to associate an id value for each input row with the correct delete button
            i++;
        });
    }
}

/* Toggle checkboxes to enable/disable categories */
function checkboxFilter(checkboxes) {

    // Add an event listener for "change" on each checkbox
    checkboxes.forEach((box) => {
        box.addEventListener("change", () => {
            // Select the accordion that's associated with the checkbox id
            let accordion = document.querySelector(`button[id='${box.name}']`);

            // Turn the accordion category on/off
            accordion.classList.toggle("disabled");
            
            // If the accordion doesn't have the class "active" toggle it
            if (!accordion.classList.contains("active")) {
                accordion.classList.toggle("active");
                accordion.firstElementChild.classList.add("fa-angle-down");
                accordion.firstElementChild.classList.remove("fa-angle-up");
            } else {
                accordion.firstElementChild.classList.add("fa-angle-up");
                accordion.firstElementChild.classList.remove("fa-angle-down");
            }
            
            // If the checkbox is checked, enable contents inside accordion, else disable
            if (box.checked) {
                accordion.nextElementSibling.classList.add("enabled");

                // Set the max-height of the accordion content so that it's displayed properly
                accordion.nextElementSibling.style.maxHeight = accordion.nextElementSibling.scrollHeight + "px";
            } else {
                accordion.nextElementSibling.classList.remove("enabled");

                // Hide content by setting max-height to 0
                accordion.nextElementSibling.style.maxHeight = 0 + "px";
            }
    
            // Recalculate result and remaining when checkbox gets toggled
            calculateResult();
            calculateRemaining();
        });
    });
}

/* Form data collection and formatting as JSON */
// https://www.youtube.com/watch?v=DqyJFV7QJqc
function formDataCollection(budgetName, budget, result, id) {

    // Ensure there's a name for the budget
    if (!budgetName) {
        throw new Error("Missing budget name");
    }

    // Create initial object to append and nest other inputs in
    let formData = {
        "info": {
        name: budgetName ? budgetName : null,
        total: budget ? budget : null,
        result: result ? result : null,
        id: id ? id : null
        },
        "categories": {}
    };

    // Select the input rows that were added by the user
    const created = document.querySelectorAll(".created");        

    // Check that there were some inputs provided
    if (created.length === 0) {
        throw new Error("No categories or invalid/missing input");
    }

    // Had to use this since forEach method won't stop even if you return
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries#examples
    // For each row of fields, get the expense and cost, adding them to the object
    for (const [index, input] of created.entries()) {

        // Get the category name so that specific expenses and costs can be assosciated with it
        const categoryName = input.dataset.category;
        let expense = input.querySelector("input[name='expense']").value.trim();
        const cost = parseFloat(input.querySelector("input[name='cost']").value.trim());

        // Select checkbox associated with input category
        const checkbox = document.querySelector(`input[name='${input.dataset.category}'].checkbox-filter`);

        // If a category is unchecked, don't include it
        if (!checkbox.checked) {
            continue;
        }

        // If there's no cost in the input skip it
        if (!cost || isNaN(cost)) {
            throw new Error("Empty cost field(s), provide cost or delete expense");
            continue;
        }

        // Check for name collisions and add the key to the object if they do
        let inputColor = input.querySelector("input[name='expense']");

        if (inputColor.style.backgroundColor === "red") {
            formData["collisions"] = true;
            throw new Error("Expense name collision(s), use unique names");
        } else if (!categoryName) {
            throw new Error("Missing categories");
        }

        // If there's no expense name, create a generic one
        if (!expense) {
            expense = "expense" + (index + 1);
        }

        // Check inputs and whether the category key exists, otherwise create it
        if (categoryName && expense && !isNaN(cost)) {
            if (!formData["categories"].hasOwnProperty(categoryName)) {
                formData["categories"][categoryName] = {};
            }

            // Add users expense and cost as key value pairs to the object
            formData["categories"][categoryName][expense] = cost;
        }
    }

    // Check that some expenses were actually provided
    if (Object.entries(formData.categories).length === 0) {
        throw new Error("No expenses were provided");
    }

    return formData;
}

/* Scroll back to top of document functionality */
function scrollToTop() {

    const scrollButton = document.querySelector(".scroll-top");

    window.onscroll = (() => {
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            scrollButton.style.display = "block";
        } else {
            scrollButton.style.display = "none";
        }
    });

    scrollButton.addEventListener("click", () => {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    });
}

/* Create a dialog when a button is clicked */
function dialogBox(dialog) {
    const showButtons = document.querySelectorAll("#delete");
    const cancelButton = document.querySelector("#cancel");
    const inputDelete = document.querySelector("#modal-input");
    const span = document.querySelector("dialog span");
    
    // For each delete button, get budget name and id associated with clicked button to
    // assign dataset contents to span and form input element, then show the modal
    showButtons.forEach((button) => {
        button.addEventListener("click", () => {

            // If it's for deleting a budget
            if (dialog.id === "budgets") {
                span.innerHTML = button.dataset.budgetName;
                inputDelete.value = button.dataset.budgetId;
            } 
            
            // If it's for deleting an account
            else if (dialog.id == "account") {
                span.innerHTML = "account";
            }
            dialog.showModal();
        });
    });

    // Close the modal if cancel button is clicked
    cancelButton.addEventListener("click", () => {
        dialog.close();
    });

    // Listen for clicks outside of the active modal window, close window if clicking outside
    dialog.addEventListener("click", (event) => {

        // https://www.youtube.com/watch?v=ywtkJkxJsdg
        // Get dialog dimensions, if a click happens outside of the modal, close it
        const dialogDimensions = dialog.getBoundingClientRect();
        
        if (event.clientX < dialogDimensions.left ||
            event.clientX > dialogDimensions.right ||
            event.clientY < dialogDimensions.top ||
            event.clientY > dialogDimensions.bottom) 
            {
            dialog.close();
        }
    });
}

/* Provide feedback when user hits max character limit for budget name or expense names */
function inputMax(input) {

    // Create alert to display when user enters too many characters
    let alert = new Alert(document.querySelector(".navbar"), document.querySelector(".scroll-top"));
    alert.clear();

    input.addEventListener("input", () => {

        // Check users input length vs. the allowed maxLength, provide feedback if it exceeds limit
        if (input.value.length === input.maxLength) {

            // Cut characters beyond max length
            input.style.backgroundColor = "red";
            setTimeout(() => {
                input.style.backgroundColor = "";
            }, 800);
            
            input.value = input.value.slice(0, input.maxLength);

            alert.create(`Input character limit reached (${input.maxLength})`);
        } else {
            alert.clear();
        }
    });
}