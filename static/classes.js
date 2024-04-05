export class Alert {

    // #msg = "alert";

    constructor(insertLoc) {
        this.insertLoc = insertLoc;
    }

    create(msg) {

        this.clear();
        // Get place to insert alert
        // let navbar = document.querySelector(".navbar");

        // Create alert components
        let div = document.createElement("div");
        let ul = document.createElement("ul");
        let li = document.createElement("li");

        // Add attributes
        div.classList.add("container");
        div.role = "alert";

        li.innerHTML = msg;
        li.classList.add("alert");

        // Append elements to DOM
        ul.appendChild(li);
        div.appendChild(ul);
        this.insertLoc.after(div);

    }

    clear() {

        // Remove existing alert
        let alert = document.querySelector("div[role='alert']");
        if (alert) {
            alert.remove();
        }
    }

    /* get msg() {
        return this.#msg;
    }

    set msg(newMsg) {
        this.#msg = newMsg;
    } */
}

export class FormControl {
    // constructor(form) {
    //     this.form = form;
    // }

    // get form() {
    //     return this.form;
    // }

    // set form(setForm) {
    //     if (!setForm || isNaN(setForm)) {
    //         throw new Error("Expected a form element");
    //     }
    //     this.form = setForm;
    // }

    enableAccordion(elements) {
        for (let accordion of elements) {
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
}