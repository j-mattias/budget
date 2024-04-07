export class Alert {

    constructor(insertLoc) {
        this.insertLoc = insertLoc;
    }

    /* Create new alert with a message */
    create(msg) {

        // Clear existing alert
        this.clear();

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

    /* Clear existing alert */
    clear() {

        // Remove existing alert
        let alert = document.querySelector("div[role='alert']");
        if (alert) {
            alert.remove();
        }
    }
}

export class FormControl {

}