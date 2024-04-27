export class Alert {

    constructor(insertLoc, warnElem) {

        // Place to insert the alert element
        this.insertLoc = insertLoc;
        this.warnElem = warnElem;
    }

    /* Create new alert with a message */
    create(msg) {

        // Clear existing alert
        this.clear();

        this.warn(this.warnElem);

        // Create alert components
        const div = document.createElement("div");
        const innerDiv = document.createElement("div");

        // Add attributes
        div.classList.add("alert-container");

        innerDiv.innerHTML = msg;
        innerDiv.classList.add("alert");
        innerDiv.role = "alert";

        // Append elements to DOM
        div.appendChild(innerDiv);
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

    /* Indicate on an element by changing background color to red */
    warn(elem) {
        elem.style.backgroundColor = "red";

        setTimeout(() => {
            elem.style.backgroundColor = "";
        }, 5000);
    }
}