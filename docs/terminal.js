/*! terminal.js - Herman Bastesen */

var path = "/home/guest"; //Current path
var dirStruct = null;
var commandHistory = [];
var tmpCmd = ""; //Temporary command storage
var cIndex = -1; //Hold current selected command index for up/down keys
const pHash = "ea0f410429251b2dae95446bdf63958df0cb2dd7190680ebf80d3db37abca93e"; //Hash of password for sudo
var auth = null; //Hash of password entered by user
var awaitInput = false; //If next command should be interpreted as input for prev
var callBack = null; //Callback after await input

function loadDirectories(filename) {
    //Load and return JSON file

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            dirStruct = JSON.parse(this.responseText);

            //Add welcome message:
            addOutput(navigate("", false)["files"]["welcome.txt"]["content"], "10px");
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
        if (e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 9 || (e.keyCode === 76 && e.ctrlKey)) {
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
            break;
        case 76: //l
            if (event.ctrlKey) handle_clear();
            break;
        case 67: //c
            if (event.ctrlKey) cancelCommand();
    }
}

function enterCommand() {
    //Parse command entered by user into terminal. Called when pressing enter after input
    
    cIndex = -1; //Reset up/down history
    tmpCmd = ""; //Reset temporary input storage
    let inputElem = document.getElementById("commandInput");
    let command = inputElem.value;
    inputElem.value = "";
    
    if (!awaitInput) {
        //Normal command
        addToLog(command);
        if (command.length > 0) commandHistory.push(command);
        parseCommand(command);
        if (!awaitInput) updatePathLabels();
    } else {
        //call command on callback
        callBack(command);
    }

    //Scroll to bottom
    let terminal = document.getElementById("terminal");
    terminal.scrollTop = terminal.scrollHeight;
}

function cancelCommand() {
    //Cancel current command (initially only cancel awaitInput)

    document.getElementById("commandInput").type = "text";
    awaitInput = false;
    callBack = null;
    updatePathLabels();
    //Scroll to bottom
    let terminal = document.getElementById("terminal");
    terminal.scrollTop = terminal.scrollHeight;
}

function createAwaitInput(prompt, cBack, hide) {
    //Prompt user for input and call that input on cBack

    awaitInput = true;
    callBack = cBack;
    document.getElementById("commandPath").textContent = prompt + ": ";
    if (hide) document.getElementById("commandInput").type = "password";
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
    //Called when user presses tab.
    //Search through current directory + files and autofill input to closest match (given there is one)
    let cmdInput = document.getElementById("commandInput");
    let query = cmdInput.value.split(" ");
    query = query[query.length - 1]; //Restrict to only last word typed

    try {
        var selDir = navigate("", false);
    } catch(error) {
        console.log("Error: unable to navigate to current directory.");
    }

    let directories = selDir["directories"]; //Directories in selected directory
    let files = selDir["files"]; //Files in selected directory    

    directories = sortedKeys(directories, false);
    files = sortedKeys(files, false);

    //Concatinate lists of directories and files:
    let all = directories.concat(files);
    all.sort();

    //Create match function:
    function isMatch(name) {
        return name.startsWith(query);
    }
    let closest = all.find(isMatch);

    if (closest) {
        cmdInput.value += closest.slice(query.length); //Fill in rest
    }
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
            case "grep":
                handle_grep(command);
                break;
            case "clear":
                handle_clear(command);
                break;
            case "help":
                handle_help(command);
                break;
            case "sudo":
                handle_sudo(command);
                break;
            default:
                addOutput("-bash: " + command + ": command not found");
        }
    }
}

function addOutput(output, fontSize) {
    //Add output to terminalOutput. Called after parsing a command

    let elem = document.createElement("div");
    elem.className = "commandOutput";
    if (fontSize != undefined) elem.style.fontSize = fontSize;
    elem.textContent = output;
    document.getElementById("terminalOutput").appendChild(elem);
}

function addToLog(command) {
    //Add entered command into terminal output by creating a command element
    //Called when entering a command before printing result

    let elem = document.createElement("div");
    elem.className = "command";

    let _path = path;
    if (path.slice(0, 11) == "/home/guest") _path = "~" + path.slice(11);
    elem.textContent = "guest@bastesen.dev:" + _path + "$ " + command;

    document.getElementById("terminalOutput").appendChild(elem);
}

function updatePathLabels() {
    //Set current path in command input and title bar
    if (path == "/home/guest") {
        document.getElementById("titlePath").textContent = "guest";
    } else if (path.slice(0, 11) == "/home/guest") {
        document.getElementById("titlePath").textContent = "~" + path.slice(11);
    } else document.getElementById("titlePath").textContent = path;

    let _path = path;
    if (path.slice(0, 11) == "/home/guest") _path = "~" + path.slice(11);
    document.getElementById("commandPath").textContent = "guest@bastesen.dev:" + _path + "$ ";
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

function getArgs(command) {
    //Return command split by space except when within quotes
    return command.match(/[^\s"']+|"([^"]*)"|'([^']*)'/gm);
}

async function digestMessage(message) {
    //Return sha256 hash of message
    const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
  }

//Command handling:

function handle_ls(command) {
    command = command.slice(3); //Strip "ls "
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

    try {
        var selDir = navigate(relativePath, false);
    } catch(error) {
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
            let s = selDir["files"][files[i]]["content"].length;
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

            let size = selDir["files"][files[i]]["content"].length;
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
    var content = command.slice(6); //Strip "mkdir "
    var contentSplit = content.split(" ");
    
    for (var i = 0; i < contentSplit.length; i++) {
        let dirSplit = contentSplit[i].split("/");
        let folderName = dirSplit[dirSplit.length-1];

        if (folderName == "") {
            addOutput("mkdir: missing operand");
            return;
        }
        
        var relativePath = contentSplit[i].substr(0, contentSplit[i].length - folderName.length - 1);
        
        try {
            var selDir = navigate(relativePath, false);
        } catch(error) {
            addOutput("mkdir: cannot create directory '" + relativePath + "': No such file or directory");
            return;
        }
        
        let exists = false;
        if (folderName in selDir["files"] || folderName in selDir["directories"]) exists = true;

        if (!exists) {
            let d = new Date();
            let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", 
                          "Sep", "Oct", "Nov", "Dec"];
            
            let date = d.getDate().toString()
            if (date.length == 1) date += " ";

            selDir["directories"][folderName] = {
                "edited": months[d.getMonth()] + " " + date + " " + 
                        d.getHours().toString() + ":" + d.getMinutes().toString(),
                "files": {},
                "directories": {}
            }
        } else {
            addOutput("mkdir: cannot create directory '" + folderName + "': File exists");
            return;
        }
    }
}

function handle_cat(command) {
    var cmdContent = command.slice(4); //Strip "cat " beggining

    let dirSplit = cmdContent.split("/");
    var filename = dirSplit[dirSplit.length-1];
    var relativePath = cmdContent.substr(0, cmdContent.length - filename.length - 1);

    try {
        var selDir = navigate(relativePath, false);

        if (filename in selDir["files"]) {
            addOutput(selDir["files"][filename]["content"]);
        } else throw "File does not exists";
    } catch(error) {
        addOutput("cat: " + cmdContent + ": No such file or directory");
        return;
    }
}

function handle_cd(command) {
    var relativePath = command.slice(3); //Strip "cd " beggining
    
    try {
        path = navigate(relativePath, true); //Try to navigate
    } catch(error) {
        addOutput("-bash: cd: " + relativePath + ": No such directory");
        return;
    }
    updatePathLabels();
}

function handle_pwd(command) {
    addOutput(path);
}

function handle_touch(command) {
    var content = command.slice(6); //Strip out "touch "
    var contentSplit = content.split(" ");

    for (var i = 0; i < contentSplit.length; i++) {
        let dirSplit = contentSplit[i].split("/");
        let filename = dirSplit[dirSplit.length-1];

        if (filename == "") {
            addOutput("touch: missing file operand");
            return;
        }

        var relativePath = contentSplit[i].substr(0, contentSplit[i].length - filename.length - 1);

        try {
            var selDir = navigate(relativePath, false);
        } catch(error) {
            addOutput("touch: cannot touch '" + relativePath + "': No such file or directory");
            return;
        }

        let d = new Date();
        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", 
                        "Sep", "Oct", "Nov", "Dec"];
        let date = d.getDate().toString()
        if (date.length == 1) date += " ";
        var nowString = months[d.getMonth()] + " " + date + " " + 
        d.getHours().toString() + ":" + d.getMinutes().toString();

        if (filename in selDir["files"]) {
            //Set edited flag to now for file
            selDir["files"][filename]["edited"] = nowString;
        } else if (filename in selDir["directories"]) {
            //Set edited flag to now for directory
            selDir["directories"][filename]["edited"] = nowString;
        } else {
            //Create file
            selDir["files"][filename] = {
                "content": "",
                "edited": nowString
            }
        }
    }
}

function handle_head(command) {
    command = command.slice(5) //Strip out "head "
    var lines = 10; //Number of lines to print if not changed by the -n x flag
    var filePath = "";

    let options = command.split(" ");

    for (var i = 0; i < options.length; i++) {
        if (options[i][0] == "-") {
            //Flag
            switch (options[i]) {
                case "-n":
                    if (i+1 == options.length) {
                        addOutput("head: option requires an argument -- 'n'");
                        return;
                    } else {
                        lines = parseInt(options[++i]);
                        if (isNaN(lines)) {
                            addOutput("head: invalid number of lines: '" + options[i] + "'");
                            return;
                        }
                    }
                    break;
                default:
                    addOutput("head: invalid option -- '" + options[i].slice(1) + "'");
                    return;
            }
        } else {
            filePath = options[i];
        }
    }
    
    let dirSplit = filePath.split("/");
    var filename = dirSplit[dirSplit.length-1];
    var relativePath = filePath.substr(0, filePath.length - filename.length - 1);

    try {
        var selDir = navigate(relativePath, false);
        if (filename in selDir["files"]) {
            var content = selDir["files"][filename]["content"].split("\n");
            var output = "";

            for (var i = 0; i < content.length && i < lines; i++) {
                output += content[i] + "\r\n";
            }
            addOutput(output);
        } else throw "File does not exists";
    } catch(error) {
        addOutput("head: cannot open '" + filePath + "' for reading: No such file or directory");
        return;
    }
}

function handle_tail(command) {
    command = command.slice(5) //Strip out "tail "
    var lines = 10; //Number of lines to print if not changed by the -n x flag
    var filePath = "";

    let options = command.split(" ");

    for (var i = 0; i < options.length; i++) {
        if (options[i][0] == "-") {
            //Flag
            switch (options[i]) {
                case "-n":
                    if (i+1 == options.length) {
                        addOutput("tail: option requires an argument -- 'n'");
                        return;
                    } else {
                        lines = parseInt(options[++i]);
                        if (isNaN(lines)) {
                            addOutput("tail: invalid number of lines: '" + options[i] + "'");
                            return;
                        }
                    }
                    break;
                default:
                    addOutput("tail: invalid option -- '" + options[i].slice(1) + "'");
                    return;
            }
        } else {
            filePath = options[i];
        }
    }
    
    let dirSplit = filePath.split("/");
    var filename = dirSplit[dirSplit.length-1];
    var relativePath = filePath.substr(0, filePath.length - filename.length - 1);

    try {
        var selDir = navigate(relativePath, false);
        if (filename in selDir["files"]) {
            var content = selDir["files"][filename]["content"].split("\n");
            var output = "";

            start = content.length - lines - 1;
            if (start < 0) start = 0;
            for (var i = start; i < content.length; i++) {
                output += content[i] + "\r\n";
            }
            addOutput(output);
        } else throw "File does not exists";
    } catch(error) {
        addOutput("tail: cannot open '" + filePath + "' for reading: No such file or directory");
        return;
    }
}

function handle_rm(command) {
    command = command.slice(3); //Strip "rm "
    const args = getArgs(command);

    var recursive = false;
    var verbose = false;
    var force = false;

    for (var i = 0; i < args.length; i++) {
        if (args[i][0] == "-") {
            switch(args[i]) {
                case "-r":
                    recursive = true;
                    break;
                case "-v":
                    verbose = true;
                    break;
                case "-f":
                    verbose = true;
                    break;
                default:
                    addOutput("cp: invalid option -- '" + args[i].slice(1) + "'");
                    return;
            }
        } else {
            var rmPath = args[i];
            var pathSplit = rmPath.split("/");

            var rmName = pathSplit[pathSplit.length-1];
            var rmRelativePath = rmPath.substr(0, rmPath.length - rmName.length - 1);

            try {
                var realPath = navigate(rmRelativePath); //Find parent folder

                if (rmName in realPath["files"]) {
                    delete realPath["files"][rmName];
                    if (verbose) addOutput("removed '" + rmPath + "'");
                } else if (rmName in realPath["directories"]) {
                    if (recursive) {
                        function rec(sel) {
                            const sFiles = sortedKeys(sel["files"], false);
                            const sDirs = sortedKeys(sel["directories"], false);
                            
                            for (var j = 0; j < sFiles.length; j++) {
                                addOutput("removed '" + sFiles[j] + "'");
                            }
                            for (var j = 0; j < sDirs.length; j++) {
                                rec(sel["directories"][sDirs[j]]);
                                addOutput("removed directory '" + sDirs[j] + "'");                            
                            }
                        }
                        rec(realPath["directories"][rmName]);
                        addOutput("removed directory '" + rmPath + "'");
                        delete realPath["directories"][rmName];                        
                    } else {
                        addOutput("rm: cannot remove '" + rmPath + "': Is a directory");
                        continue;
                    }
                } else {
                    addOutput("rm: failed to remove '" + rmPath + "': No such file or directory");
                    continue;
                }                
            } catch(error) {
                addOutput("rm: failed to remove '" + rmPath + "': No such file or directory");
                continue;
            }
        }
    }
}

function handle_rmdir(command) {
    command = command.slice(6); //Strip "mkdir "

    const args = getArgs(command);
    for (var i = 0; i < args.length; i++) {
        //For each folder in the argument list
        var dirPath = args[i];
        var dirSplit = dirPath.split("/");

        var dirName = dirSplit[dirSplit.length-1];
        var dirRelativePath = dirPath.substr(0, dirPath.length - dirName.length - 1);

        try {
            var rmDir = navigate(dirRelativePath); //Find parent folder

            if (dirName in rmDir["directories"]) {
                delete rmDir["directories"][dirName];
            } else if (dirName in rmDir["files"]) {
                addOutput("rmdir: failed to remove '" + dirPath + "': Not a directory");
                continue;
            } else {
                addOutput("rmdir: failed to remove '" + dirPath + "': No such file or directory");
                continue;
            }
        } catch(error) {
            addOutput("rmdir: failed to remove '" + dirPath + "': No such file or directory");
            continue;
        }
    }
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
    command = command.slice(3); //Strip "cp "
    const args = getArgs(command);

    //Possible option flags:
    var recursive = false;
    var verbose = false;
    var force = false;

    var source = null;
    var dest = null;

    //Parse options and get source/dest pair:
    for (var i = 0; i < args.length; i++) {
        if (args[i][0] == "-") {
            switch(args[i]) {
                case "-r":
                case "-R":
                    recursive = true;
                    break;
                case "-f":
                    force = true;
                    break;
                case "-v":
                    verbose = true;
                    break;
                default:
                    addOutput("cp: invalid option -- '" + args[i].slice(1) + "'");
                    return;
            }
        } else {
            source = args[i];
            if (i == args.length - 1) {
                //Missing destination arg
                addOutput("cp: missing destination file operand after '" + source + "'");
            }
            dest = args[i+1];
            break;
        }
    }

    //Perform copy:
    try {
        const sourceSplit = source.split("/");
        const sourceFilename = sourceSplit[sourceSplit.length-1];
        const sourceRelativePath = source.substr(0, source.length - sourceFilename.length - 1);

        const destSplit = dest.split("/");
        const destFilename = destSplit[destSplit.length-1];
        const destRelativePath = dest.substr(0, dest.length - destFilename.length - 1);

        var selDir = navigate(sourceRelativePath, false);
        if (sourceFilename in selDir["files"]) {
            //Copy file
            try {
                var destDir = navigate(destRelativePath);
                var sourceAttr = sortedKeys(selDir["files"][sourceFilename], false);
                
                //Copy attributes:
                destDir["files"][destFilename] = {};
                for (var i = 0; i < sourceAttr.length; i++) {
                    destDir["files"][destFilename][sourceAttr[i]] = selDir["files"][sourceFilename][sourceAttr[i]];
                }

                if (verbose) addOutput("'" + source + "' -> '" + dest + "'");
            } catch(error) {
                //Unable to navigate to dest directory
                addOutput("cp: cannot create regular file '" + dest + "': No such file or directory");
                return;
            }
        } else if (sourceFilename in selDir["directories"] && recursive) {
            //Copy directory
            try {
                var destDir = navigate(destRelativePath);
                var sourceAttr = sortedKeys(selDir["files"][sourceFilename], false);

                destDir["directories"][destFilename] = { ...selDir["directories"][sourceFilename]};

                if (verbose) {
                    function rec(src, dst) {
                        const sFiles = sortedKeys(src["files"], false);
                        const sDirs = sortedKeys(src["directories"], false);

                        const dFiles = sortedKeys(dst["files"], false);
                        const dDirs = sortedKeys(dst["directories"], false);
                        
                        for (var i = 0; i < sFiles.length; i++) {
                            addOutput("'" + sFiles[i] + "' -> '" + dFiles[i] + "'");
                        }
                        for (var i = 0; i < sDirs.length; i++) {
                            addOutput("'" + sDirs[i] + "' -> '" + sDirs[i] + "'");                            
                            rec(src["directories"][sDirs[i]], dst["directories"][dDirs[i]]);
                        }
                    }
                    addOutput("'" + source + "' -> '" + dest + "'");
                    rec(selDir["directories"][sourceFilename], destDir["directories"][destFilename]);
                }
            } catch(error) {
                //Unable to navigate to dest directory
                addOutput("cp: cannot create directory '" + dest + "': No such file or directory");
                return;
            }
        } else if (sourceFilename in selDir["directories"] && !recursive) {
            //Source is a directory but recursive flag not set
            addOutput("cp: -r not specified; omitting directory '"+ source + "'");
            return;
        } else throw "File does not exists";
    } catch(error) {
        //Unable to navigate to source directory
        addOutput("cp: cannot stat: '" + source + "': No such file or directory");
        return;
    }
}

function handle_mv(command) {
    command = command.slice(3); //Strip "mv "
    const args = getArgs(command);

    //Possible option flags:
    var verbose = false;
    var force = false;

    var source = null;
    var dest = null;

    //Parse options and get source/dest pair:
    for (var i = 0; i < args.length; i++) {
        if (args[i][0] == "-") {
            switch(args[i]) {
                case "-f":
                    force = true;
                    break;
                case "-v":
                    verbose = true;
                    break;
                default:
                    addOutput("mv: invalid option -- '" + args[i].slice(1) + "'");
            }
        } else {
            source = args[i];
            if (i == args.length - 1) {
                //Missing destination arg
                addOutput("mv: missing destination file operand after '" + source + "'");
            }
            dest = args[i+1];
            break;
        }
    }

    //Perform move:
    try {
        const sourceSplit = source.split("/");
        const sourceFilename = sourceSplit[sourceSplit.length-1];
        const sourceRelativePath = source.substr(0, source.length - sourceFilename.length - 1);

        const destSplit = dest.split("/");
        const destFilename = destSplit[destSplit.length-1];
        const destRelativePath = dest.substr(0, dest.length - destFilename.length - 1);

        var selDir = navigate(sourceRelativePath, false);
        if (sourceFilename in selDir["files"]) {
            //Move file
            try {
                var destDir = navigate(destRelativePath);
                var sourceAttr = sortedKeys(selDir["files"][sourceFilename], false);
                
                //Move attributes:
                destDir["files"][destFilename] = {};
                for (var i = 0; i < sourceAttr.length; i++) {
                    destDir["files"][destFilename][sourceAttr[i]] = selDir["files"][sourceFilename][sourceAttr[i]];
                }
                delete selDir["files"][sourceFilename];

                if (verbose) addOutput("'" + source + "' -> '" + dest + "'");
            } catch(error) {
                //Unable to navigate to dest directory
                addOutput("mv: cannot create regular file '" + dest + "': No such file or directory");
                return;
            }
        } else if (sourceFilename in selDir["directories"]) {
            //Move directory
            try {
                var destDir = navigate(destRelativePath);
                var sourceAttr = sortedKeys(selDir["files"][sourceFilename], false);

                destDir["directories"][destFilename] = { ...selDir["directories"][sourceFilename]};
                
                if (verbose) {
                    function rec(src, dst) {
                        sFiles = sortedKeys(src["files"], false);
                        sDirs = sortedKeys(src["directories"], false);
                        
                        dFiles = sortedKeys(dst["files"], false);
                        dDirs = sortedKeys(dst["directories"], false);
                        
                        for (var i = 0; i < sFiles.length; i++) {
                            addOutput("'" + sFiles[i] + "' -> '" + dFiles[i] + "'");
                        }
                        for (var i = 0; i < sDirs.length; i++) {
                            addOutput("'" + sDirs[i] + "' -> '" + sDirs[i] + "'");                            
                            rec(src["directories"][sDirs[i]], dst["directories"][dDirs[i]]);
                        }
                    }
                    addOutput("'" + source + "' -> '" + dest + "'");
                    rec(selDir["directories"][sourceFilename], destDir["directories"][destFilename]);
                }
                delete selDir["directories"][sourceFilename];
            } catch(error) {
                //Unable to navigate to dest directory
                addOutput("mv: cannot create directory '" + dest + "': No such file or directory");
                return;
            }
        } else throw "File does not exists";
    } catch(error) {
        //Unable to navigate to source directory
        addOutput("mv: cannot stat: '" + source + "': No such file or directory");
        return;
    }
}

function handle_find(command) {
    addOutput("Not implemented..");
}

function handle_grep(command) {
    command = command.slice(5) //Strip out "grep "
    //split by space unless inside quotes:
    const args = getArgs(command);
    const filepath = args[args.length-1];
    try {
        const pattern = RegExp(args[0]);
    } catch(e) {
        addOutput("grep: bad regular expression '" + args[0] + "'")
        return;
    }

    //Borrow from cat:
    let dirSplit = filepath.split("/");
    var filename = dirSplit[dirSplit.length-1];
    var relativePath = filepath.substr(0, filepath.length - filename.length - 1);

    try {
        var selDir = navigate(relativePath, false);

        if (filename in selDir["files"]) {
            const lines = selDir["files"][filename]["content"].split("\n");

            for (var i = 0; i < lines.length; i++) {
                if (pattern.test(lines[i])) addOutput(lines[i]);
            }
        } else throw "File does not exists";
    } catch(error) {
        addOutput("grep: " + filepath + ": No such file or directory");
        return;
    }    
}

function handle_clear(command) {
    document.getElementById("terminalOutput").innerHTML = "";
}

function handle_sudo(command) {
    if (auth === pHash) {
        parseCommand(command.substr(5)) //Just parse rest of command
    } else {
        //Must auth
        createAwaitInput("[sudo] password for guest", async function (password) {
            auth = await digestMessage(password);
            if (auth === pHash) {
                parseCommand(command.substr(5)) //Just parse rest of command
                cancelCommand();
            } else {
                 addOutput("Sorry, try again.");
            }
        }, true);
    }
}

function handle_help(command) {
    let output = "";
    output += "cat <filename> \r\n";
    output += "cd <path> \r\n";
    output += "clear \r\n";
    output += "cp [-r] [-v] <source> <dest> \r\n";
    output += "find \r\n";
    output += "grep <pattern> <filename> \r\n";
    output += "head [-n nlines] <filename> \r\n";
    output += "help \r\n";
    output += "history \r\n";
    output += "ls [-l] [-a] [-F] [-r] [path] \r\n";
    output += "mkdir <dirname> \r\n";
    output += "mv [-v] <source> <dest>\r\n";
    output += "pwd \r\n";
    output += "rm [-r] [-v] <path> \r\n";
    output += "rmdir <directory> \r\n";
    output += "touch <filename> \r\n";
    output += "tail [-n nlines] <filename> \r\n";
    addOutput(output);
}
