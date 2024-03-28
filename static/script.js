document.addEventListener("DOMContentLoaded", function () {

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
            inputCost.setAttribute("required", "true");

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
    form.addEventListener("submit", function(event) {

        // Prevent default behavior
        event.preventDefault();

        let budget = parseFloat(document.querySelector("input[name='budget']").value);

        // Create initial object to append and nest other inputs in
        let formData = {
            name: document.querySelector("input[name='name']").value.trim(),
            total: budget
        };

        // Select the input rows that were added by the user
        let created = document.querySelectorAll(".created");
        
        let collisions = 0;

        // For each row of fields, get the expense and cost, adding them to the object
        created.forEach((input) => {

            // Get the category name so that specific expenses and costs can be assosciated with it
            let categoryName = input.dataset.category;
            let expense = input.querySelector("input[name='expense']").value.trim();
            let cost = parseFloat(input.querySelector("input[name='cost']").value.trim());

            // Check for name collisions and add the key to the object if they do
            let inputColor = input.querySelector("input[name='expense']").style.backgroundColor;
            if (inputColor === "red") {
                collisions++;
                formData["collisions"] = collisions;
            }

            // Check inputs and whether the category key exists, otherwise create it
            if (categoryName && expense && !isNaN(cost)) {
                if (!formData.hasOwnProperty(categoryName)) {
                    formData[categoryName] = {};
                }

                // Add users expense and cost as key value pairs to the object
                formData[categoryName][expense] = cost;
            } else {
                console.log("Invalid input");
            }
        });
        
        // Send a POST request to the /create view
        fetch("/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

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
            console.log("name exists");
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

        if (nodeValue === elemValue && node.id != elem.id && nodeCategory === elemCategory) {
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