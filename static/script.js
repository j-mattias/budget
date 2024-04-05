import { Alert } from "./classes.js";

document.addEventListener("DOMContentLoaded", function () {

    const navbar = document.querySelector(".navbar");
    let alert = new Alert(navbar);
    alert.clear();
    // clearAlert();
    generatedInputs();
    editForm();

    // let newForm = new FormControl();
    /* Accordion */
    // https://www.w3schools.com/howto/howto_js_accordion.asp
    const accordions = document.querySelectorAll(".accordion");
    enableAccordions(accordions);
    // newForm.enableAccordion(accordions);
    
    const addButtons = document.querySelectorAll(".add");
    const created = document.querySelectorAll(".created");
    addInputs(addButtons, created);

    /* Form data collection and formatting */
    // https://www.youtube.com/watch?v=DqyJFV7QJqc

    // Select the form
    const form = document.querySelector(".budget-form");

    // Listen for the submit event
    form.addEventListener("submit", async function(event) {

        // Prevent default behavior
        event.preventDefault();

        const budgetName = document.querySelector("input[name='name']").value.trim();
        const budget = parseFloat(document.querySelector("input[name='budget']").value);
        const result = parseFloat(document.querySelector("#result").innerHTML);

        // Ensure there's a name for the budget
        if (!budgetName) {
            // createAlert("Missing budget name");
            alert.create("Missing budget name");
            return;
        }

        // Create initial object to append and nest other inputs in
        let formData = {
            "info": {
            name: budgetName ? budgetName : null,
            total: budget ? budget : null,
            result: result ? result : null
            },
            "categories": {}
        };

        // Select the input rows that were added by the user
        let created = document.querySelectorAll(".created");        

        // Check that there were some inputs provided
        if (created.length === 0) {
            // createAlert("No categories or invalid/missing input");
            alert.create("No categories or invalid/missing input");
            return;
        }

        // Had to use this since forEach method won't stop even if you return
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries#examples
        // For each row of fields, get the expense and cost, adding them to the object
        for (const [index, input] of created.entries()) {

            // Get the category name so that specific expenses and costs can be assosciated with it
            let categoryName = input.dataset.category;
            let expense = input.querySelector("input[name='expense']").value.trim();
            let cost = parseFloat(input.querySelector("input[name='cost']").value.trim());

            // If there's no cost in the input skip it
            if (!cost || isNaN(cost)) {
                continue;
            }

            // Check for name collisions and add the key to the object if they do
            let inputColor = input.querySelector("input[name='expense']");

            if (inputColor.style.backgroundColor === "red") {
                // createAlert("Expense name collision(s), use unique names");
                alert.create("Expense name collision(s), use unique names");
                formData["collisions"] = true;
                return;
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

        // Send a POST request to the /create view
        let request = await fetch("/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        // clearAlert();
        alert.clear();

        // Get response from server
        let response = await request.json();
        for (let msg in response) {
            // createAlert(response[msg]);
            alert.create(response[msg]);
            console.log("response " + response[msg]);
        }

        console.log(formData);
        console.log(JSON.stringify(formData));
    });
});

function enableAccordions(buttons) {
    for (let accordion of buttons) {
        accordion.addEventListener("click", function() {
    
            // Toggle the active class on/off
            this.classList.toggle("active");
    
            // Select the item class, the sibling of accordion
            let item = this.nextElementSibling;
            let icon = this.querySelector(".material-icons");
    
            // If category is open, close it
            // if (item.style.display == "block") {
            if (item.classList.contains("enabled")) {
                // item.style.display = "none";
                item.classList.add("disabled");
                item.classList.remove("enabled");
                icon.textContent = "expand_more";
            // Else open it
            } else {
                // item.style.display = "block";
                item.classList.add("enabled");
                item.classList.remove("disabled");
                icon.textContent = "expand_less";
            }
        });
    }
}

// /* Delete inputs */
function removeInput(id) {
    // this.parentElement.remove();
    const div = document.getElementById(id);
    div.remove();
}

/* Give feedback if expense names are the same */
function preventNameCollision(input) {
    input.addEventListener("input", function() {
        if (valueExists(input, "input[name='expense']")) {
            input.style.backgroundColor = "red";
            // console.log("name exists");
        } else {
            input.style.backgroundColor = "";
        } 
    });
}

/* Check if an input value already exists */
function valueExists(elem, select) {
    let nodeList = document.querySelectorAll(select);
    let exists = false;

    // Check existing input fields to see if value already exists, category specific
    nodeList.forEach((node) => {
        let elemCategory = elem.parentElement.dataset.category;
        let nodeCategory = node.parentElement.dataset.category;
        let nodeValue = node.value.toLowerCase();
        let elemValue = elem.value.toLowerCase();

        if (nodeValue === elemValue && node.id != elem.id && nodeCategory === elemCategory && nodeValue != "" && elemValue != "") {
            exists = true;
        }
    });
    return exists;
}

/* Update the total result as user inputs costs */
function updateResult(input) {
    let nodeList = document.querySelectorAll("input[name='cost']");
    let total;
    let result = document.querySelector("#result");

    // Add event listener to each cost input
    input.addEventListener("input", function() {
        total = 0;

        // Check value of each cost input in the DOM, add values together
        nodeList.forEach((node) => {
            let value = parseFloat(node.value);

            // Check that the value is a number
            if (isNaN(value)) {
                value = 0;
            }

            total += parseFloat(value);
        });

        // Limit display result to 2 decimal places
        result.innerHTML = total.toFixed(2);
    });
}

/* // Create alert message to inform user of error
function createAlert(error) {

    clearAlert();

    // Create alert element, showing the error message
    if (error) {

        // Get place to insert alert
        let navbar = document.querySelector(".navbar");

        // Create alert components
        let div = document.createElement("div");
        let ul = document.createElement("ul");
        let li = document.createElement("li");

        // Add attributes
        div.classList.add("container");
        div.role = "alert";

        li.innerHTML = error;
        li.classList.add("alert");

        // Append elements to DOM
        ul.appendChild(li);
        div.appendChild(ul);
        navbar.after(div);
    }
    return;
}

// Clear alert
function clearAlert() {

    // Remove existing alert
    let alert = document.querySelector("div[role='alert']");
    if (alert) {
        alert.remove();
    }
} */

function generatedInputs() {
    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
        if (input.name === "expense") {
            preventNameCollision(input);
        }
        else if (input.name === "cost") {
            updateResult(input);
        }
    });

    const deleteButtons = document.querySelectorAll(".delete");
    deleteButtons.forEach((button) => {
        button.addEventListener("click", () => {
            removeInput(button.parentElement.id);
        });
    });
}

/* Toggling form fields on/off and showing/hiding elements for adding/removing fields */
function editForm() {
    const edit = document.querySelector("#edit");
    
    if (edit === null) {
        return;
    }
    
    edit.addEventListener("click", function() {

        const form = document.querySelector(".budget-form");
        const inputs = form.querySelectorAll("input");

        inputs.forEach((input) => {
            if (input.hasAttribute("disabled")) {
                input.removeAttribute("disabled");
            } else {
                input.setAttribute("disabled", "true");
            }
        });

        const addButtons = document.querySelectorAll(".add");
        addButtons.forEach((addButton) => {
            addButton.classList.toggle("disabled");
        });

        const deleteButtons = document.querySelectorAll(".delete");
        deleteButtons.forEach((deleteButton) => {
            deleteButton.classList.toggle("disabled");
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

    for (let addButton of buttons) {
        addButton.addEventListener("click", function() {  
            
            // Create inputs and set some attribute values
            const inputExpense = document.createElement("input");
            const inputCost = document.createElement("input");
            
            inputExpense.type = "text";
            inputExpense.name = "expense";
            inputExpense.placeholder = "Expense";
            inputExpense.id = i;
            
            inputCost.type = "number";
            inputCost.name = "cost";
            inputCost.placeholder = "Cost";
            inputCost.step = "0.01";
            inputCost.min = "0.01";
            
            // Create div and append inputs
            const div = document.createElement("div");            
            div.dataset.category = addButton.id;
            div.id = i;
            div.classList.add("created");
            
            div.appendChild(inputExpense);
            div.appendChild(inputCost);
            
            // Add a button to remove inputs
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.textContent = "-";
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
    
            // Increment i to associate an id value for each input row with the correct delete button
            i++;
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    
    const checkedCategories = document.querySelectorAll("input[type='checkbox']");

    checkedCategories.forEach((box) => {
        box.addEventListener("change", () => {
            let accordion = document.querySelector(`button[id='${box.id}']`);
            accordion.classList.toggle("disabled");
            if (box.checked) {
                accordion.nextElementSibling.classList.add("enabled");
                accordion.nextElementSibling.classList.remove("disabled");
            } else {
                accordion.nextElementSibling.classList.remove("enabled");
                accordion.nextElementSibling.classList.add("disabled");
            }
        });
    });
});