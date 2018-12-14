var path = "/home/guest"; //Current path
var dirStruct = null;
var commandHistory = [];
var tmpCmd = ""; //Temporary command storage
var cIndex = -1; //Hold current selected command index for up/down keys

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

function onloadPrep() {
    //Onload preparations
    
    loadDirectories("directory.json"); //Load directory structure
    //Prevent up/down keys from changing carret position:
    document.getElementById('commandInput').addEventListener('keydown', function(e) {
        if (e.which === 38 || e.which === 40) {
            e.preventDefault();
        }
    });
    focusInput();
}

function focusInput() {
    //Focus on input element. Called when cliking inside terminal
    document.getElementById("commandInput").focus();
}

function inputKeydown(event) {
    //Called each time user presses key while input box is in focus

    switch (event.keyCode) {
        case 13: //Enter
            enterCommand();
            break;
        case 38: //Up arrow
            prevCommand();
            break;
        case 40: //Down arrow
            nextCommand();
            break;
        case 9: //Tab
            autofill();
    }
}

function enterCommand() {
    //Parse command entered by user into terminal. Called when pressing enter after input
    
    cIndex = -1; //Reset up/down history
    tmpCmd = ""; //Reset temporary input storage
    let inputElem = document.getElementById("commandInput");
    let command = inputElem.value;
    addToLog(command);
    inputElem.value = "";

    if (command.length > 0) commandHistory.push(command);
    parseCommand(command);
    updatePathLabels();
}

function prevCommand() {
    //Called when user presses up key. Loads up previous entered command (given there is one)

    var cmdInput = document.getElementById("commandInput");
    if (commandHistory.length > 0) {
        if (cIndex > 0) {
            cIndex--;
        } else if (cIndex == -1) {
            cIndex = commandHistory.length -1;
            tmpCmd = cmdInput.value;
        }
        cmdInput.value = commandHistory[cIndex];
    }
}

function nextCommand() {
    //Called when user presses down key. Loads up next entered command (given there is one)

    var cmdInput = document.getElementById("commandInput");
    
    if (cIndex != -1) {
        cIndex++;
        if (cIndex == commandHistory.length) {
            cIndex = -1;
            cmdInput.value = tmpCmd;
        } else {
            cmdInput.value = commandHistory[cIndex];
        }
    }
}

function autofill() {
    
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

function navigate(relativePath, getPath) {
    //Navigate to selected path and return directory from dirStruct
    //getPath: boolean return path istead of directory

    let truePath = path;
    //Find true path:
    if (relativePath != "") {
        if (relativePath.slice(0, 2) == "..") {
            truePath = truePath.slice(0, truePath.lastIndexOf("/")); //Jump back by one directory
            relativePath = relativePath.slice(2);
        } else if (relativePath.slice(0, 1) == ".") {
            relativePath = relativePath.slice(1);
        } else if (relativePath.slice(0, 1) != "/") {
            relativePath = "/" + relativePath;
        }
        truePath += relativePath;
    }

    //Navigate to truePath:
    let pathSplit = truePath.split("/");
    let selDir = dirStruct["/"];
    for (var i = 1; i < pathSplit.length; i++) {
        selDir = selDir["directories"][pathSplit[i]];
        if (!selDir) throw "Invalid path";
    }
    if (getPath) return truePath;
    return selDir;
}

function sortedKeys(dict, reverse) {
    //Return keys of dictionary in sorted order

    var keys = [];
    for (var key in dict) {
        keys.push(key);
    }
    keys.sort();
    if (reverse) keys.reverse();
    return keys;
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
                case "-la":
                    verbose = true;
                    hidden = true;
                    break;
                case "-F":
                    markDirs = true;
                    break;
                case "-r":
                    reverse = true;
                default:
                    addOutput("ls: invalid option -- '" + options[i].slice(1) + "'");
                    return;
            }
        } else {
            //Path
            relativePath = options[i];
        }
    }

    try {
        var selDir = navigate(relativePath, false);
    } catch {
        addOutput("ls: cannot access '" + relativePath + "': No such file or directory");
        return;
    }

    let output = "";
    let directories = selDir["directories"]; //Directories in selected directory
    let files = selDir["files"]; //Files in selected directory

    if (hidden) {
        //Add hidden files and directories
        directories["."] = {"edited": selDir["edited"]};
        directories[".."] = {"edited": selDir["edited"]};
    }

    //Sort directory and file lists:
    directories = sortedKeys(directories, reverse);
    files = sortedKeys(files, reverse);
    
    if (!verbose) {
        //Normal list
        
        for (var i = 0; i < directories.length; i++) {
            output += directories[i];
            if (markDirs) output += "/";
            output += " ";
        }
        
        for (var i = 0; i < files.length; i++) {
            output += files[i] + " ";
        }
    } else {
        //Verbose list

        //Find largest file size:
        var longest = 0;
        for (var i = 0; i < files.length; i++) {
            let s = selDir["files"][files[i]]["size"];
            if (s.toString().length > longest) longest = s.toString().length;
        }
        
        //Print directories:
        for (var i = 0; i < directories.length; i++) {
            if (output.length > 0) output += "\r\n";

            let edited = selDir["directories"][directories[i]]["edited"];
            let padding = longest - 3;
            if (padding < 0) {
                longest = 3;
                padding = 0;
            }
            output += "drwxr-xr-x 1 guest guest " + " ".repeat(padding) + "512 " + edited + " " +  directories[i];
        }

        //Print files:
        for (var i = 0; i < files.length; i++) {
            if (output.length > 0) output += "\r\n";

            let size = selDir["files"][files[i]]["size"];
            let edited = selDir["files"][files[i]]["edited"];
            let padding = longest - size.toString().length;
            if (padding < 0) padding = 0;
            output += "drwxr-xr-x 1 guest guest " + " ".repeat(padding) + size + " " + edited + " " +  files[i];
        }
        
    }
    addOutput(output);

    if (hidden) {
        //Reset . and .. pointers
        delete selDir["directories"][".."];
        delete selDir["directories"]["."];
    }
}

function handle_mkdir(command) {

}

function handle_cat(command) {

}

function handle_cd(command) {
    var relativePath = command.slice(3); //Strip "cd " beggining
    
    try {
        path = navigate(relativePath, true); //Try to navigate
    } catch {
        addOutput("-bash: cd: " + relativePath + ": No such file or directory");
        return;
    }
    updatePathLabels();
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
