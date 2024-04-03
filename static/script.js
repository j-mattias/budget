document.addEventListener("DOMContentLoaded", function () {

    clearAlert();

    /* Accordion */
    // https://www.w3schools.com/howto/howto_js_accordion.asp
    const accordions = document.querySelectorAll(".accordion");

    for (let accordion of accordions) {
        accordion.addEventListener("click", function() {

            // Toggle the active class on/off
            this.classList.toggle("active");

            // Select the item class, the sibling of accordion
            let item = this.nextElementSibling;
            let icon = this.querySelector(".material-icons");

            // If category is open, close it
            if (item.style.display == "block") {
                item.style.display = "none";
                icon.textContent = "expand_more";
            // Else open it
            } else {
                item.style.display = "block";
                icon.textContent = "expand_less";
            }
        });
    }

    /* Add and remove input fields for categories */
    const addButtons = document.querySelectorAll(".add");
    let i = 0;
    for (let addButton of addButtons) {
        addButton.addEventListener("click", function() {  
            
            // Create inputs and set some attribute values
            let inputExpense = document.createElement("input");
            let inputCost = document.createElement("input");

            inputExpense.type = "text";
            inputExpense.name = "expense";
            inputExpense.placeholder = "Expense";
            inputExpense.id = i;

            inputCost.type = "number";
            inputCost.name = "cost";
            inputCost.placeholder = "Cost";
            inputCost.step = "0.01";
            inputCost.min = "0.01";
            // inputCost.setAttribute("required", "true");

            // Create div and append inputs
            let div = document.createElement("div");            
            div.dataset.category = addButton.id;
            div.id = i;
            div.classList.add("created");

            div.appendChild(inputExpense);
            div.appendChild(inputCost);

            // Add a button to remove inputs
            let removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.textContent = "-";
            removeButton.classList.add("delete");
            removeButton.setAttribute("onclick", `removeInput(${div.id})`);
            div.appendChild(removeButton);

            // Add inputs to correct category
            let item = document.querySelector(`#${addButton.id}`);
            item.appendChild(div);

            // Add event listeners for inputs to provide more feedback
            preventNameCollision(inputExpense);
            updateResult(inputCost);

            // Increment i to associate an id value for each input row with the correct delete button
            i++;
        });
    }

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
            createAlert("Missing budget name");
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
            createAlert("No categories or invalid/missing input")
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
                createAlert("Expense name collision(s), use unique names");
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

        clearAlert();

        // Get response from server
        let response = await request.json();
        for (let msg in response) {
            createAlert(response[msg]);
            console.log("response " + response[msg]);
        }

        console.log(formData);
        console.log(JSON.stringify(formData));
    });
});

/* Delete inputs */
function removeInput(id) {
    let div = document.getElementById(id);
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

/* Create alert message to inform user of error */
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

function clearAlert() {

    // Remove existing alert
    let alert = document.querySelector("div[role='alert']");
    if (alert) {
        alert.remove();
    }
}