var path = "/home/guest"; //Current path
var dirStruct = null;
loadDirectories("directory.json"); //Load directory structure
var commandHistory = [];

function loadDirectories(filename) {
    //Load and return JSON file

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            dirStruct = JSON.parse(this.responseText);
        }
    };
    xmlhttp.open("GET", filename, true);
    xmlhttp.send();
}

function focusInput() {
    //Focus on input element. Called when cliking inside terminal
    document.getElementById("commandInput").focus();
}

function enterCommand() {
    //Parse command entered by user into terminal. Called when pressing enter after input

    let inputElem = document.getElementById("commandInput");
    let command = inputElem.value;
    addToLog(command);
    inputElem.value = "";

    commandHistory.push(command);
    parseCommand(command);
    updatePathLabels();
}

function parseCommand(command) {
    //Parse given command, performing appropriate action

    if (command.length > 0) {
        switch (command.split(" ")[0]) {
            case "ls":
                handle_ls(command);
                break;
            case "mkdir":
                handle_mkdir(command);
                break;
            case "cat":
                handle_cat(command);
                break;
            case "cd":
                handle_cd(command);
                break;
            case "pwd":
                handle_pwd(command);
                break;
            case "touch":
                handle_touch(command);
                break;
            case "head":
                handle_head(command);
                break;
            case "tail":
                handle_tail(command);
                break;
            case "rm":
                handle_rm(command);
                break;
            case "rmdir":
                handle_rmdir(command);
                break;
            case "history":
                handle_history(command);
                break;
            case "cp":
                handle_cp(command);
                break;
            case "mv":
                handle_mv(command);
                break;
            case "find":
                handle_find(command);
                break;
            case "quota":
                handle_quota(command);
                break;
            case "clear":
                handle_clear(command);
                break;
            case "help":
                handle_help(command);
                break;
            default:
                addOutput("-bash: " + command + ": command not found");
        }
    }
}

function addOutput(output) {
    //Add output to terminalOutput. Called after parsing a command

    let elem = document.createElement("div");
    elem.className = "commandOutput";
    elem.textContent = output;
    document.getElementById("terminalOutput").appendChild(elem);
}

function addToLog(command) {
    //Add entered command into terminal output by creating a command element
    //Called when entering a command before printing result

    let elem = document.createElement("div");
    elem.className = "command";

    let _path = path;
    if (path == "/home/guest") _path = "~";
    elem.textContent = "guest@brakebusk.com:" + _path + "$ " + command;

    document.getElementById("terminalOutput").appendChild(elem);
}

function updatePathLabels() {
    //Set current path in command input and title bar
    if (path == "/home/guest") document.getElementById("titlePath").textContent = "guest";
    else document.getElementById("titlePath").textContent = path;

    let _path = path;
    if (path == "/home/guest") _path = "~";
    document.getElementById("commandPath").textContent = "guest@brakebusk.com:" + _path + "$ ";
}

//Command handling:

function handle_ls(command) {
    command = command.slice(3); //Strip "ls " beggining
    let options = command.split(" ");
    let relativePath = "";

    //Possible option flags:
    let verbose = false; //-l option
    let hidden = false; //-a option
    let markDirs = false; //-F option
    let reverse = false; //-r option
    let sort = false; //-lS option

    //Parse options:
    for (var i = 0; i < options.length; i++) {
        //For each option
        if (options[i][0] == "-") {
            //Flag
            switch (options[i]) {
                case "-l":
                    verbose = true;
                    break;
                case "-a":
                    hidden = true;
                    break;
                case "-F":
                    markDirs = true;
                    break;
                case "-r":
                    reverse = true;
                case "-lS":
                    sort = true;
                    break;
                default:
                    addOutput("ls: invalid option -- '" + options[i].slice(1) + "'");
                    return;
            }
        } else {
            //Path
            relativePath = options[i];
        }
    }

    let truePath = path;
    //Find true path:
    if (relativePath != "") {
        if (relativePath.slice(0, 2) == "..") {
            truePath = truePath.slice(0, truePath.lastIndexOf("/")); //Jump back by one directory
            relativePath = relativePath.slice(2);
        } else if (relativePath.slice(0, 1) == ".") {
            relativePath = relativePath.slice(1);
        }
        truePath += relativePath;
    }

    let pathSplit = truePath.split("/");
    console.log(truePath);
    let selDir = dirStruct["/"];
    for (var i = 1; i < pathSplit.length; i++) {
        try {
            selDir = selDir["directories"][pathSplit[i]];
        } catch {
            addOutput("ls: cannot access '" + relativePath + "' no such file or directory");
            return;
        }
    }

    let output = "";
    let directories = selDir["directories"]; //Directories in selected directory
    let files = selDir["files"]; //Files in selected directory


    console.log(selDir);
    console.log(directories);
    console.log(files);

    for (var dirName in directories) {
        output += dirName + " ";
    }

    for (var filename in files) {
        output += filename + " ";
    }
    addOutput(output);
}

function handle_mkdir(command) {

}

function handle_cat(command) {

}

function handle_cd(command) {

}

function handle_pwd(command) {

}

function handle_touch(command) {

}

function handle_head(command) {

}

function handle_tail(command) {

}

function handle_rm(command) {

}

function handle_rmdir(command) {

}

function handle_history(command) {
    //Output complete history of commands
    let output = "";
    for (var c = 0; c < commandHistory.length; c++) {
        output += " " + (c + 1) + " " + commandHistory[c];
        if (c < commandHistory.length - 1) output += "\r\n";

    }
    addOutput(output);
}

function handle_cp(command) {

}

function handle_mv(command) {

}

function handle_find(command) {

}

function handle_quota(command) {

}

function handle_clear(command) {
    document.getElementById("terminalOutput").innerHTML = "";
}

function handle_help(command) {
    let output = "";
    output += "cat \r\n";
    output += "cd \r\n";
    output += "clear \r\n";
    output += "cp \r\n";
    output += "find \r\n";
    output += "head \r\n";
    output += "help \r\n";
    output += "history \r\n";
    output += "ls \r\n";
    output += "mkdir \r\n";
    output += "mv \r\n";
    output += "pwd \r\n";
    output += "quota \r\n";
    output += "rm \r\n";
    output += "rmdir \r\n";
    output += "touch \r\n";
    output += "tail \r\n";
    addOutput(output);
}
