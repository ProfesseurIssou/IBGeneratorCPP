'use strict';

import * as vscode from 'vscode';
import * as os from 'os';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import fetch from 'node-fetch';
import { spawn } from "child_process";

interface IBGeneratorProjectsJSON {
    version: string;
    directories?: string[];
    templates: {
        [templateName: string]: {
            directories?: [string];
            blankFiles?: [string];
            files?: { [from: string]: string };
            openFiles?: [string];
        };
    };
}


interface IBGeneratorClassesJSON {
    [className: string]: {
        [fileName: string]: {
            folder: string;
            extension: string;
        }
    };
}

export function activate(context: vscode.ExtensionContext) {
    let createProjectCommand = vscode.commands.registerCommand('ibgenerator.createProject', createProject);
    let createClassCommand = vscode.commands.registerCommand('ibgenerator.createClass', createClass);

    let buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    buildButton.command = 'workbench.action.tasks.build';
    buildButton.text = '⚙ Build';
    buildButton.tooltip = 'Build C++ Project (make) [Ctrl+F7]';
    buildButton.show();

    let buildAndRunButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    buildAndRunButton.command = 'workbench.action.tasks.test';
    buildAndRunButton.text = '▶ Build & Run';
    buildAndRunButton.tooltip = 'Build & Run C++ Project (make run) [F7]';
    buildAndRunButton.show();

    context.subscriptions.push(buildButton);
    context.subscriptions.push(buildAndRunButton);
    context.subscriptions.push(createProjectCommand);
    context.subscriptions.push(createClassCommand);
}

export function deactivate() {
}

const createClass = async () => {
    try {
        const templates:IBGeneratorClassesJSON = JSON.parse('{"constructor":{"ibclass.cpp":{"folder":"src","extension":"cpp"},"ibclass.hpp":{"folder":"include","extension":"hpp"}},"empty":{"ibclass.cpp":{"folder":"src","extension":"cpp"},"ibclass.hpp":{"folder":"include","extension":"hpp"}},"singleton":{"ibclass.cpp":{"folder":"src","extension":"cpp"},"ibclass.hpp":{"folder":"include","extension":"hpp"}},"template":{"ibclass.tpp":{"folder":"src","extension":"tpp"},"ibclass.hpp":{"folder":"include","extension":"hpp"}}}');
        const template_files = [];
        for(let tname in templates){template_files.push(tname);}

        const selected = await vscode.window.showQuickPick(template_files);
        if(!selected){return;}

        const val = await vscode.window.showInputBox({ prompt: `Enter class name` });
        if(!val||!vscode.window.activeTextEditor){return;}

        const currentFolderWorkspace = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
        if(!currentFolderWorkspace){return;}

        const currentFolder = currentFolderWorkspace.uri.fsPath;
        if(selected == "constructor"){
            //HPP
            let hppValue = "#pragma once\n\nclass ibclass {\n\npublic:\n\tibclass();\n\t~ibclass();\n};";
            hppValue = hppValue.replace(new RegExp('ibclass',"g"),val);
            writeFileSync(`${currentFolder}/${templates[selected]["ibclass.hpp"].folder}/${val}.${templates[selected]["ibclass.hpp"].extension}`, hppValue);
            vscode.workspace.openTextDocument(`${currentFolder}/${templates[selected]["ibclass.hpp"].folder}/${val}.${templates[selected]["ibclass.hpp"].extension}`)
                .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
            //CPP
            let cppValue = '#include "ibclass.hpp"\n\nibclass::ibclass() {\n\n}\n\nibclass::~ibclass() {\n\n}';
            cppValue = cppValue.replace(new RegExp('ibclass',"g"),val);
            writeFileSync(`${currentFolder}/${templates[selected]["ibclass.cpp"].folder}/${val}.${templates[selected]["ibclass.cpp"].extension}`, cppValue);
            vscode.workspace.openTextDocument(`${currentFolder}/${templates[selected]["ibclass.cpp"].folder}/${val}.${templates[selected]["ibclass.cpp"].extension}`)
                .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
        }
        if(selected == "empty"){
            //HPP
            let hppValue = "#pragma once\n\nclass ibclass {\n\n};";
            hppValue = hppValue.replace(new RegExp('ibclass',"g"),val);
            writeFileSync(`${currentFolder}/${templates[selected]["ibclass.hpp"].folder}/${val}.${templates[selected]["ibclass.hpp"].extension}`, hppValue);
            vscode.workspace.openTextDocument(`${currentFolder}/${templates[selected]["ibclass.hpp"].folder}/${val}.${templates[selected]["ibclass.hpp"].extension}`)
                .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
            //CPP
            let cppValue = '#include "ibclass.hpp"\n';
            cppValue = cppValue.replace(new RegExp('ibclass',"g"),val);
            writeFileSync(`${currentFolder}/${templates[selected]["ibclass.cpp"].folder}/${val}.${templates[selected]["ibclass.cpp"].extension}`, cppValue);
            vscode.workspace.openTextDocument(`${currentFolder}/${templates[selected]["ibclass.cpp"].folder}/${val}.${templates[selected]["ibclass.cpp"].extension}`)
                .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
        }
        if(selected == "singleton"){
            //HPP
            let hppValue = "#pragma once\n\nclass ibclass {\n\npublic:\n\tstatic ibclass& getInstance();\n\n\tibclass(easyclass const&) = delete;\n\tvoid operator=(ibclass const&) = delete;\n\nprivate:\n\tibclass();};";
            hppValue = hppValue.replace(new RegExp('ibclass',"g"),val);
            writeFileSync(`${currentFolder}/${templates[selected]["ibclass.hpp"].folder}/${val}.${templates[selected]["ibclass.hpp"].extension}`, hppValue);
            vscode.workspace.openTextDocument(`${currentFolder}/${templates[selected]["ibclass.hpp"].folder}/${val}.${templates[selected]["ibclass.hpp"].extension}`)
                .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
            //CPP
            let cppValue = '#include "ibclass.hpp"\n\nibclass::ibclass() {\n\n}\n\nibclass& ibclass::getInstance() {\nstatic ibclass instance;\nreturn instance;\n}';
            cppValue = cppValue.replace(new RegExp('ibclass',"g"),val);
            writeFileSync(`${currentFolder}/${templates[selected]["ibclass.cpp"].folder}/${val}.${templates[selected]["ibclass.cpp"].extension}`, cppValue);
            vscode.workspace.openTextDocument(`${currentFolder}/${templates[selected]["ibclass.cpp"].folder}/${val}.${templates[selected]["ibclass.cpp"].extension}`)
                .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
        }
    } catch (err) {
        vscode.window.showErrorMessage(`IBGenerator error: ${err}`);
    }
};

const createProject = async (local?: boolean) => {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage("Open a folder or workspace before creating a project!");
        return;
    }
    let templates = [];

    try {
        let data = JSON.parse('{"version": "2","directories": [".vscode","bin","include","lib","src"],"templates": {"[G++/GDB] Linux": {"files": {"shared/Makefile": "Makefile","shared/tasks.json": ".vscode/tasks.json","hello-world/main.cpp": "src/main.cpp","gcc/launch.json": ".vscode/launch.json"},"openFiles":["src/main.cpp"]}}}');

        for (let tname in data.templates) { templates.push(tname); }

        const selected = await vscode.window.showQuickPick(templates);
        await selectFolderAndDownload(data, selected, local);
        vscode.workspace.getConfiguration('files').update('associations', { "*.tpp": "cpp" }, vscode.ConfigurationTarget.Workspace);
        vscode.workspace.getConfiguration('terminal.integrated.shell').update('windows', "cmd.exe", vscode.ConfigurationTarget.Workspace);
    } catch (error) {
        if (local) {
            vscode.window.showErrorMessage(`IBGenerator Projects error: ${error}`);
        } else {
            vscode.window.showWarningMessage(`IBGenerator Projects error: ${error}`);
            createProject(true);
        }
    }
};

const selectFolderAndDownload = async (files: IBGeneratorProjectsJSON, templateName: string | undefined, local?: boolean, custom?: boolean) => {
    if (!templateName || !vscode.workspace.workspaceFolders) { return; }

    if (vscode.workspace.workspaceFolders.length > 1) {
        try {
            const chosen = await vscode.window.showWorkspaceFolderPick();
            if (!chosen) { return; }
            let folder = chosen.uri;
            await downloadTemplate(files, templateName, folder.fsPath, local);
        } catch (err) {
            vscode.window.showErrorMessage(`IBGenerator error: ${err}`);
        }

    } else {
        downloadTemplate(files, templateName, vscode.workspace.workspaceFolders[0].uri.fsPath, local, custom);
    }
};

const downloadTemplate = async (files: IBGeneratorProjectsJSON, templateName: string, folder: string, local?: boolean, custom?: boolean) => {
    if (files.directories) {
        files.directories.forEach((dir: string) => {
            if (!existsSync(`${folder}/${dir}`)) {
                mkdirSync(`${folder}/${dir}`);
            }
        });
    }

    let directories = files.templates[templateName].directories;
    if (directories) {
        directories.forEach((dir: string) => {
            if (!existsSync(`${folder}/${dir}`)) {
                mkdirSync(`${folder}/${dir}`);
            }
        });
    }

    let blankFiles = files.templates[templateName].blankFiles;
    if (blankFiles) {
        blankFiles.forEach((file: string) => {
            if (!existsSync(`${folder}/${file}`)) {
                writeFileSync(`${folder}/${file}`, '');
            }
        });
    }
    
    //POUR CHAQUE TEMPLATE
    if(templateName == "[G++/GDB] Linux"){
        //MAKEFILE
        const makefileValue = "CXX\t\t  := g++\nCXX_FLAGS := -Wall -Wextra -std=c++17 -ggdb\n\nBIN\t\t:= bin\nSRC\t\t:= src\nINCLUDE\t:= include\nLIB\t\t:= lib\n\nLIBRARIES\t:=\nEXECUTABLE\t:= main.exe\n\n\nall: $(BIN)/$(EXECUTABLE)\n\nrun: clean all\n\tcls\n\t./$(BIN)/$(EXECUTABLE)\n\n$(BIN)/$(EXECUTABLE): $(SRC)/*.cpp\n\t$(CXX) $(CXX_FLAGS) -I$(INCLUDE) -L$(LIB) $^ -o $@ $(LIBRARIES)\n\nclean:\n\t#CMD\n-del $(BIN) /F /Q\n#POWERSHELL\n#-del $(BIN)/* -Force\n";
        writeFileSync(`${folder}/Makefile`, makefileValue);
        //TASK.JSON
        const taskValue = '{\n\t"version": "2.0.0",\n\t"tasks": [\n\t\t{\n\t\t\t"label": "Build C++ project",\n\t\t\t"type": "shell",\n\t\t\t"group": {\n\t\t\t\t"kind": "build",\n\t\t\t\t"isDefault": true\n\t\t\t},\n\t\t\t"command": "make",\n//"command": "mingw32-make",\n\t\t},\n\t\t{\n\t\t\t"label": "Build & run C++ project",\n\t\t\t"type": "shell",\n\t\t\t"group": {\n\t\t\t\t"kind": "test",\n\t\t\t\t"isDefault": true\n\t\t\t},\n\t\t\t"command": "make",\n//"command": "mingw32-make",\n\t\t\t"args": [\n\t\t\t\t"run"\n\t\t\t]\n\t\t}\n\t]\n}';
        writeFileSync(`${folder}/.vscode/tasks.json`, taskValue);
        //MAIN.CPP
        const mainValue = '#include <iostream>\n\nint main() {\n\tstd::cout << "Hello IBgenerator project!" << std::endl;\n}';
        writeFileSync(`${folder}/src/main.cpp`, mainValue);
        //LAUNCH.JSON
        const launchValue = '{\n\t"version": "0.2.0",\n\t"configurations": [\n\t\t{\n\t\t\t"name": "C++ Debug (gdb)",\n\t\t\t"type": "cppdbg",\n\t\t\t"request": "launch",\n\t\t\t"program": "${workspaceFolder}/bin/main.exe",\n\t\t\t"preLaunchTask": "Build C++ project",\n\t\t\t"args": [],\n\t\t\t"stopAtEntry": false,\n\t\t\t"cwd": "${workspaceFolder}",\n\t\t\t"environment": [],\n\t\t\t"externalConsole": false,\n\t\t\t"MIMode": "gdb.exe",\n\t\t\t"miDebuggerPath": "gdb.exe",\n\t\t\t"setupCommands": [\n\t\t\t\t{\n\t\t\t\t\t"description": "Enable pretty-printing for gdb",\n\t\t\t\t\t"text": "-enable-pretty-printing",\n\t\t\t\t\t"ignoreFailures": true\n\t\t\t\t}\n\t\t\t]\n\t\t}\n\t]\n}';
        writeFileSync(`${folder}/.vscode/launch.json`, launchValue);
    }





    let openFiles = files.templates[templateName].openFiles;
    if (openFiles) {
        for (let file of openFiles) {
            if (existsSync(`${folder}/${file}`)) {
                vscode.workspace.openTextDocument(`${folder}/${file}`)
                    .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
            }
        }
    }

    if (!existsSync(`${folder}/.vscode`)) {
        mkdirSync(`${folder}/.vscode`);
    }
    writeFileSync(`${folder}/.vscode/.ibgenerator`, 'This file is created by IBGenerator Projects, do not delete it OR I DELETE YOU');
};