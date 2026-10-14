// =========================================================
// WINDOWS 95/98 PORTFOLIO
// =========================================================

const windows = document.querySelectorAll(".window");
const desktop = document.getElementById("desktop");
const taskbarPrograms = document.getElementById("taskbar-programs");

let highestZ = 100;


// =========================================================
// WINDOW ACTIVATION
// =========================================================

function activateWindow(windowElement) {

    windows.forEach((win) => {
        win.classList.remove("active");
    });

    document.querySelectorAll(".taskbar-window-button").forEach((button) => {
        button.classList.remove("active");
    });

    highestZ++;

    windowElement.style.zIndex = highestZ;
    windowElement.classList.add("active");

    const taskButton = document.querySelector(
        `.taskbar-window-button[data-task-window="${windowElement.id}"]`
    );

    if (taskButton) {
        taskButton.classList.add("active");
    }
}


// =========================================================
// TASKBAR BUTTONS
// =========================================================

function createTaskbarButton(windowElement) {

    const existingButton = document.querySelector(
        `.taskbar-window-button[data-task-window="${windowElement.id}"]`
    );

    if (existingButton) {
        return;
    }

    const button = document.createElement("button");

    button.className = "taskbar-window-button";
    button.dataset.taskWindow = windowElement.id;

    button.textContent =
        windowElement.dataset.title || "Window";

    button.addEventListener("click", () => {

        if (windowElement.style.display === "none") {

            windowElement.style.display = windowElement.id === "pentagon-window" ? "flex" : "block";

            activateWindow(windowElement);

        } else if (windowElement.classList.contains("active")) {

            minimizeWindow(windowElement);

        } else {

            windowElement.style.display = windowElement.id === "pentagon-window" ? "flex" : "block";

            activateWindow(windowElement);
        }

    });

    taskbarPrograms.appendChild(button);
}


// =========================================================
// OPEN WINDOW
// =========================================================

function openWindow(windowElement) {

    if (!windowElement) {
        return;
    }

    windowElement.style.display = windowElement.id === "pentagon-window" ? "flex" : "block";

    createTaskbarButton(windowElement);

    activateWindow(windowElement);
}


// =========================================================
// CLOSE WINDOW
// =========================================================

function closeWindow(windowElement) {

    if (!windowElement) {
        return;
    }

    windowElement.style.display = "none";
    windowElement.classList.remove("active");

    const taskButton = document.querySelector(
        `.taskbar-window-button[data-task-window="${windowElement.id}"]`
    );

    if (taskButton) {
        taskButton.remove();
    }
}


// =========================================================
// MINIMIZE WINDOW
// =========================================================

function minimizeWindow(windowElement) {

    if (!windowElement) {
        return;
    }

    windowElement.style.display = "none";
    windowElement.classList.remove("active");

    const taskButton = document.querySelector(
        `.taskbar-window-button[data-task-window="${windowElement.id}"]`
    );

    if (taskButton) {
        taskButton.classList.remove("active");
    }
}


// =========================================================
// MAXIMIZE WINDOW
// =========================================================

function toggleMaximize(windowElement) {

    if (!windowElement) {
        return;
    }

    windowElement.classList.toggle("maximized");

    activateWindow(windowElement);
}


// =========================================================
// DATA-WINDOW BUTTONS
// =========================================================

document.querySelectorAll("[data-window]").forEach((button) => {

    button.addEventListener("dblclick", () => {

        /*
         * Desktop icons and Explorer icons open
         * with a double click.
         */

        if (
            button.classList.contains("desktop-icon") ||
            button.classList.contains("file-icon")
        ) {

            const target =
                document.getElementById(button.dataset.window);

            openWindow(target);
        }

    });


    button.addEventListener("click", () => {

        /*
         * Start-menu items open with one click.
         */

        if (button.classList.contains("start-item")) {

            const target =
                document.getElementById(button.dataset.window);

            openWindow(target);

            closeStartMenu();
        }

    });

});


// =========================================================
// WINDOW CONTROL BUTTONS
// =========================================================

document.querySelectorAll(".close-button").forEach((button) => {

    button.addEventListener("click", (event) => {

        event.stopPropagation();

        const windowElement =
            button.closest(".window");

        closeWindow(windowElement);

    });

});


document.querySelectorAll(".minimize-button").forEach((button) => {

    button.addEventListener("click", (event) => {

        event.stopPropagation();

        const windowElement =
            button.closest(".window");

        minimizeWindow(windowElement);

    });

});


document.querySelectorAll(".maximize-button").forEach((button) => {

    button.addEventListener("click", (event) => {

        event.stopPropagation();

        const windowElement =
            button.closest(".window");

        toggleMaximize(windowElement);

    });

});


// =========================================================
// WINDOW FOCUS
// =========================================================

windows.forEach((windowElement) => {

    windowElement.addEventListener("mousedown", () => {

        activateWindow(windowElement);

    });

});


// =========================================================
// WINDOW DRAGGING
// =========================================================

document.querySelectorAll(".window-titlebar").forEach((titlebar) => {

    titlebar.addEventListener("mousedown", (event) => {

        if (event.target.closest(".window-controls")) {
            return;
        }

        const windowElement =
            titlebar.closest(".window");

        if (windowElement.classList.contains("maximized")) {
            return;
        }

        activateWindow(windowElement);

        const startMouseX = event.clientX;
        const startMouseY = event.clientY;

        const startLeft = windowElement.offsetLeft;
        const startTop = windowElement.offsetTop;


        function moveWindow(moveEvent) {

            let newLeft =
                startLeft +
                moveEvent.clientX -
                startMouseX;

            let newTop =
                startTop +
                moveEvent.clientY -
                startMouseY;


            /*
             * Keep the title bar accessible.
             */

            newLeft = Math.max(
                0,
                Math.min(
                    newLeft,
                    window.innerWidth - 100
                )
            );

            newTop = Math.max(
                0,
                Math.min(
                    newTop,
                    window.innerHeight - 70
                )
            );


            windowElement.style.left =
                newLeft + "px";

            windowElement.style.top =
                newTop + "px";
        }


        function stopMoving() {

            document.removeEventListener(
                "mousemove",
                moveWindow
            );

            document.removeEventListener(
                "mouseup",
                stopMoving
            );
        }


        document.addEventListener(
            "mousemove",
            moveWindow
        );

        document.addEventListener(
            "mouseup",
            stopMoving
        );

    });

});


// =========================================================
// START MENU
// =========================================================

const startButton =
    document.getElementById("start-button");

const startMenu =
    document.getElementById("start-menu");


function closeStartMenu() {

    startMenu.classList.remove("open");
    startButton.classList.remove("active");
}


startButton.addEventListener("click", (event) => {

    event.stopPropagation();

    startMenu.classList.toggle("open");
    startButton.classList.toggle("active");

});


startMenu.addEventListener("click", (event) => {

    event.stopPropagation();

});


document.addEventListener("click", () => {

    closeStartMenu();

});


// =========================================================
// HELP OK BUTTON
// =========================================================

document.querySelectorAll(".close-help").forEach((button) => {

    button.addEventListener("click", () => {

        const helpWindow =
            document.getElementById("help-window");

        closeWindow(helpWindow);

    });

});


// =========================================================
// RESTART WEBSITE
// =========================================================

const restartYes =
    document.getElementById("restart-yes");

const restartNo =
    document.getElementById("restart-no");


if (restartYes) {

    restartYes.addEventListener("click", () => {

        /*
         * Reset saved display settings.
         */

        localStorage.removeItem("website-theme");
        localStorage.removeItem("explorer-view");

        location.reload();

    });

}


if (restartNo) {

    restartNo.addEventListener("click", () => {

        closeWindow(
            document.getElementById("restart-window")
        );

    });

}


// =========================================================
// CLOCK
// =========================================================

function updateClock() {

    const clock =
        document.getElementById("clock");

    const now =
        new Date();

    clock.textContent =
        now.toLocaleTimeString(
            [],
            {
                hour: "numeric",
                minute: "2-digit"
            }
        );
}


updateClock();

setInterval(updateClock, 1000);


// =========================================================
// CLASSIC FILE / EDIT / VIEW / HELP MENUS
// =========================================================

function closeAllDropdownMenus() {

    document
        .querySelectorAll(".menu-group.open")
        .forEach((menu) => {

            menu.classList.remove("open");

        });

}


// Open menu

document.querySelectorAll(".menu-button").forEach((button) => {

    button.addEventListener("click", (event) => {

        event.stopPropagation();

        const group =
            button.closest(".menu-group");

        const wasOpen =
            group.classList.contains("open");

        closeAllDropdownMenus();

        if (!wasOpen) {
            group.classList.add("open");
        }

    });

});


// Clicking dropdown itself should not immediately close it

document.querySelectorAll(".dropdown-menu").forEach((menu) => {

    menu.addEventListener("click", (event) => {

        event.stopPropagation();

    });

});


// Clicking somewhere else closes dropdowns

document.addEventListener("click", () => {

    closeAllDropdownMenus();

});


// =========================================================
// FILE -> CLOSE
// =========================================================

document.querySelectorAll(".menu-close-window").forEach((button) => {

    button.addEventListener("click", () => {

        const windowElement =
            button.closest(".window");

        closeAllDropdownMenus();

        closeWindow(windowElement);

    });

});


// =========================================================
// EDIT -> LIGHT / DARK MODE
// =========================================================

function updateThemeChecks() {

    const dark =
        document.body.classList.contains("dark-mode");


    document.querySelectorAll(".light-check").forEach((check) => {

        check.textContent =
            dark ? "" : "●";

    });


    document.querySelectorAll(".dark-check").forEach((check) => {

        check.textContent =
            dark ? "●" : "";

    });

}


function setWebsiteTheme(theme) {

    if (theme === "dark") {

        document.body.classList.add("dark-mode");

    } else {

        document.body.classList.remove("dark-mode");

    }


    localStorage.setItem(
        "website-theme",
        theme
    );


    updateThemeChecks();

    closeAllDropdownMenus();

}


document.querySelectorAll(".theme-light").forEach((button) => {

    button.addEventListener("click", () => {

        setWebsiteTheme("light");

    });

});


document.querySelectorAll(".theme-dark").forEach((button) => {

    button.addEventListener("click", () => {

        setWebsiteTheme("dark");

    });

});


// Restore previous theme

const savedWebsiteTheme =
    localStorage.getItem("website-theme");


if (savedWebsiteTheme === "dark") {

    document.body.classList.add("dark-mode");

}


updateThemeChecks();


// =========================================================
// VIEW -> LARGE / SMALL ICONS
// =========================================================

function updateViewChecks(mode) {

    document.querySelectorAll(".large-check").forEach((check) => {

        check.textContent =
            mode === "large" ? "●" : "";

    });


    document.querySelectorAll(".small-check").forEach((check) => {

        check.textContent =
            mode === "small" ? "●" : "";

    });

}


function setExplorerView(mode) {

    document.querySelectorAll(".explorer-content").forEach((content) => {

        content.classList.remove(
            "large-icons",
            "small-icons"
        );


        if (mode === "small") {

            content.classList.add(
                "small-icons"
            );

        } else {

            content.classList.add(
                "large-icons"
            );

        }

    });


    localStorage.setItem(
        "explorer-view",
        mode
    );


    updateViewChecks(mode);

    closeAllDropdownMenus();

}


document.querySelectorAll(".view-large").forEach((button) => {

    button.addEventListener("click", () => {

        setExplorerView("large");

    });

});


document.querySelectorAll(".view-small").forEach((button) => {

    button.addEventListener("click", () => {

        setExplorerView("small");

    });

});


// Restore previous Explorer view

const savedExplorerView =
    localStorage.getItem("explorer-view") || "large";


setExplorerView(savedExplorerView);


// =========================================================
// HELP MENU -> EXISTING HELP WINDOW
// =========================================================

document.querySelectorAll(".menu-open-help").forEach((button) => {

    button.addEventListener("click", () => {

        closeAllDropdownMenus();

        const helpWindow =
            document.getElementById("help-window");

        openWindow(helpWindow);

    });

});