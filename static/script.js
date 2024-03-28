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

        // Create initial object to append and nest other inputs in
        let formData = {
            budget: document.querySelector("input[name='budget']").value.trim()
        };

        // Select the input rows that were added by the user
        let created = document.querySelectorAll(".created");
        
        // For each row of fields, get the expense and cost, adding them to the object
        created.forEach((input) => {

            // Get the category name so that specific expenses and costs can be assosciated with it
            let categoryName = input.dataset.category;
            let expense = input.querySelector("input[name='expense']").value.trim();
            let cost = parseFloat(input.querySelector("input[name='cost']").value.trim());

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
