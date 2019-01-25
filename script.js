// Team 1540 Analysis App
// Written by Dylan Smith

"use strict";

window.$ = window.jQuery = require("jquery");
const fs = require("fs-extra");

const exec = require("child_process").execSync; // lets us run stuff from terminal
const OUR_TEAM = "1540"; // put your team number here!

// the year of this game
const year = 2018;

// the competition
const comp = "2019 Wilsonville";

// are photos currently visible?
let photos = false;

/********************************************/
/*            DETERMINING TEAMS             */
/********************************************/

// finds which teams are at the event using schedule.json
function determineTeams() {
  let matches = Object.keys(schedule);
  // loops through each match
  for (let match_id in matches) {
    let match = schedule[match_id];
    for (let team_id in match) {
      // checks to see if team is already in array
      if (teams.indexOf(match[team_id]) < 0) {
        // adds it to team list
        teams.push(match[team_id]);
      }
    }
  }
}

// actually inserts team into html, called by insertTeams()
function insertTeam(team) {
  // adds it to the team page with NUMBER, NAME, and ENTER BTN
  $(".teams-body").append(`
    <tr>
      <td>` + team + `</td>
      <td>` + team_id_to_name[team] + `</td>
      <td><button name="` + team + `" class="btn btn-success team-btn team` + team + `">Enter &#8594</button></td>
    </tr>
  `);
  // if ENTER BTN is pressed, switch to that team's page
  $(".team" + team).click(function() {
    switchPages("team", team, 1)
  });
  // this team is fully loaded, prepping sortTable()
  loaded_teams += 1;
}

// inserts teams into Teams page
function insertTeams() {
  // first, check to see if team_id_to_name matches teams
  if (fs.existsSync("./teams.json")) {
    // if there is a teams file, use that to determine team names at the event
    let file = JSON.parse(fs.readFileSync("./teams.json"));
    // if the list of teams we know equal to the keys of the teams.json file
    if (arraysEqual(teams, Object.keys(file))) {
      // put all the info into team_id_to_name
      team_id_to_name = file;
      for (let team_id in teams) {
        let team = teams[team_id];
        // adds them to the "teams page"
        insertTeam(team);
      }
    // if the arrays were not equal, just pull from TBA
    } else {
      insertTeamsWithTBA();
    }
  // if we don't know team names, get them from TBA
  } else {
    insertTeamsWithTBA();
  }
}

/********************************************/
/*           HANDLING DATA FILES            */
/********************************************/

// manifests and data
let manifest_stand = [];
let stand_data = {};
let manifest_pit = [];
let pit_data = {};
let manifest_images = [];
let image_data = {};
let manifest_notes = [];
let notes_data = {};

// a list of teams, equivalent to Object.keys(team_id_to_name)
let teams = [];
// team numbers to a team name
let team_id_to_name = {}

// number of loaded teams
let loaded_teams = 0;

// loads local stand, pit, notes, and image data
function loadData() {
  // STAND
  loadStandData();
  // PIT
  loadPitData();
  // IMAGES
  loadImageData();
  // NOTES
  loadNotesData();
}

// loads data from data/stand/manifest.json
function loadStandData() {
  // loads through each file in manifest
  for (let data_id in manifest_stand) {
    let file_name = manifest_stand[data_id]; // e.g. m1-r1-1540.json
    if (fs.existsSync("./data/stand/" + file_name)) {
      let data_point = JSON.parse(fs.readFileSync("./data/stand/" + file_name));
      // sets defaults if values are non-existent
      setDefaultsForStand(data_point, file_name);
      let team_name = data_point["info"]["team"];
      if (stand_data[team_name] === undefined) { stand_data[team_name] = []; }
      // adds data point to stand_data
      stand_data[team_name].push(data_point);
    }
  }
  // for each team, sorts by match
  for (let team_id in teams) {
    let team = teams[team_id];
    if (stand_data[team] !== undefined) {
      stand_data[team].sort(compareByMatch);
    }
  }
}

// loads data from data/pit/manifest.json
function loadPitData() {
  // loads through each file in manifest
  for (let data_id in manifest_pit) {
    let file_name = manifest_pit[data_id]; // e.g. 1540.json
    if (fs.existsSync("./data/pit/" + file_name)) {
      let data_point = JSON.parse(fs.readFileSync("./data/pit/" + file_name));
      let team_name = data_point["info"]["team"];
      // sets defaults if values are non-existent
      setDefaultsForPit(data_point);
      // adds data point to pit_data
      pit_data[team_name] = data_point;
    }
  }
}

// loads data from data/images/manifest.json
function loadImageData() {
  // loads through each link/file in manifest
  for (let data_id in manifest_images) {
    let file_name = manifest_images[data_id]; // e.g. "1540-2.json" or "1540@https://i.imgur.com/2p3NEQB.png"
    // if there is an "@" in the name (i.e. if from the world wide web)
    if (file_name.split("@").length > 1) {
      // splits by "@" symbol, splitting into "1540" and "https://i.imgur.com/2p3NEQB.png"
      let split = file_name.split("@");
      if (image_data[split[0]] === undefined) { image_data[split[0]] = []; }
      image_data[split[0]].push(split[1]);
    // else, it is a local file
    } else if (fs.existsSync("./data/images/" + file_name)) {
      let team_name = file_name.split(".")[0].split("-")[0]
      if (image_data[team_name] === undefined) { image_data[team_name] = []; }
      image_data[team_name].push("./data/images/" + file_name);
    }
  }
}

// loads data from data/notes/manifest.json
function loadNotesData() {
  // loads through each file in manifest
  for (let data_id in manifest_notes) {
    let file_name = manifest_notes[data_id]; // 5-135935359979.json (the second # is just for getting rid of duplicates)
    if (fs.existsSync("./data/notes/" + file_name)) {
      let data_point = JSON.parse(fs.readFileSync("./data/notes/" + file_name));
      let dp_match = data_point["match"];
      // finds what teams are in the data
      for (let team_index in schedule[dp_match]) {
        let team_name = schedule[dp_match][team_index];
        if (notes_data[team_name] === undefined) { notes_data[team_name] = []; }
        notes_data[team_name].push([data_point[team_index.toString()], data_point["match"]]);
      }
    }
  }
}

// sets default values for a stand data file
function setDefaultsForStand(data_point, file_name) {
  /////////////////////////////////////////////////////////////////////////////////////
  // REMOVE THIS PART ONCE WE ACTUALLY COLLECT NEW DATA
  // It adds match, role, and team to stand app files, which the new stand app automatically does
  /////////////////////////////////////////////////////////////////////////////////////
  let parts = file_name.split("-");
  parts[2] = parts[2].split(".")[0] // removing the .json
  if (data_point["info"] === undefined) {
    data_point["info"] = {}
    data_point["info"]["match"] = parts[0].substr(1);
    data_point["info"]["role"] = parts[1];
    data_point["info"]["team"] = parts[2];
  }
  // sets default values to unfilled JSON requirements
  traverseScoutKitJSON(defaultStandJSON, function(json, page, page_index, question, question_index) {
    // if the question is not in the JSON
    if (data_point[page][question] === undefined) {
      // it adds the default response
      data_point[page][question] = defaultStandJSON[page][question];
    }
  });
}

// sets default values for a pit data file
function setDefaultsForPit(data_point) {
  // sets default values to unfilled JSON requirements
  traverseScoutKitJSON(defaultPitJSON, function(json, page, page_index, question, question_index) {
    // if the question is not in the JSON
    if (data_point[page][question] === undefined) {
      // it adds the default response
      data_point[page][question] = defaultPitJSON[page][question];
    }
  });
}

/********************************************/
/*           HANDLING MISC. FILES           */
/********************************************/

// default pit
let defaultPitJSON = {}
// default stand
let defaultStandJSON = {}
// match schedule
let schedule = {};
// scouts on the team
let scouts = [];

// function that loads the important files (above)
function loadImportantFiles() {
  // Schedule
  if (fs.existsSync("./data/schedule.json")) {
    schedule = JSON.parse(fs.readFileSync("./data/schedule.json"));
  } else {
    alert("Please load a valid schedule."); return;
  }
  // Scouts
  if (fs.existsSync("./data/scouts.json")) {
    scouts = JSON.parse(fs.readFileSync("./data/scouts.json"));
  } else {
    alert("Please load a valid scouts file."); return;
  }
  // The app functions without the following files
  if (fs.existsSync("./data/default-pit.json")) {
    defaultPitJSON = JSON.parse(fs.readFileSync("./data/default-pit.json"));
  }
  if (fs.existsSync("./data/default-stand.json")) {
    defaultStandJSON = JSON.parse(fs.readFileSync("./data/default-stand.json"));
  }
  // Loading manifest files
  if (fs.existsSync("./data/stand/manifest.json")) {
    manifest_stand = JSON.parse(fs.readFileSync("./data/stand/manifest.json"));
  };
  if (fs.existsSync("./data/pit/manifest.json")) {
    manifest_pit = JSON.parse(fs.readFileSync("./data/pit/manifest.json"));
  };
  if (fs.existsSync("./data/notes/manifest.json")) {
    manifest_notes = JSON.parse(fs.readFileSync("./data/notes/manifest.json"));
  };
  if (fs.existsSync("./data/images/manifest.json")) {
    manifest_images = JSON.parse(fs.readFileSync("./data/images/manifest.json"));
  };
}

// exports stand data to CSV
function exportDataToCSV() {
  // sorts the team by number
  teams.sort();
  // the columns of the sheet
  let export_sheet = "1540 Data,Hatch Mean,Hatch Median,Hatch Maximum,Cargo Mean,Cargo Median,Cargo Maximum,Climb\n";
  // for each team...
  for (let team_index in teams) {
    let team = teams[team_index];
    // calculaet scores
    let scores = calculateScores(team);
    export_sheet += (team + ",");
    // adds hatch and cargo mean, median, and maximums
    export_sheet += (jStat.mean(scores[1]) + ",");
    export_sheet += (jStat.median(scores[1]) + ",");
    export_sheet += (jStat.max(scores[1]) + ",");
    export_sheet += (jStat.mean(scores[2]) + ",");
    export_sheet += (jStat.median(scores[2]) + ",");
    export_sheet += (jStat.max(scores[2]) + ",");
    let team_matches = Object.keys(stand_data[team]);
    // add a list of their endgame performance
    for (let match_index in team_matches) {
      let match = stand_data[team][team_matches[match_index]];
      export_sheet += (match["Endgame"]["Platform"])
      if (match["Endgame"]["Assistance"] !== "none") {
        export_sheet += (" (" + match["Endgame"]["Assistance"] + ")");
      }
      export_sheet += "; ";
    }
    export_sheet += "\n"
  }
  // save the file
  fs.writeFileSync("./data/export/export.csv", export_sheet);
  alert("export.csv saved!");
}

/********************************************/
/*       GETTING DATA FROM FLASHDRIVE       */
/********************************************/

// which type of file we are uploading via settings
// either data, schedule, or scouts
let searching = undefined;

// loads a schedule or scouts file from a path
function loadFileFromPath(path) {
  if (searching == "scouts") {
    // copies the scouts file over
    let file = fs.readFileSync(path).toString();
    if (isJsonString(file) && file[0] == "{") {
      fs.writeFileSync("./data/scouts.json", file);
    }
    // copies the schedule file over
  } else if (searching == "schedule") {
    let file = fs.readFileSync(path).toString();
    if (isJsonString(file) && file[0] == "{") {
      fs.writeFileSync("./data/schedule.json", file);
    }
  }
  // reload that page!
  window.location.reload();
}

// loads data from a path and moves it to the "data" folder
function loadDataFromPath(path) {
  // if we are looking for data
  if (searching == "data") {
    // loading stand and pit data
    const types = ["stand", "pit", "notes"];
    // runs the following code for "stand", "pit", and "notes"
    for (let type_id in types) {
      let type = types[type_id];
      // if the manifest exists
      if (fs.existsSync(path + "/" + type + "/manifest.json")) {
        let temp_manifest = fs.readFileSync(path + "/" + type + "/manifest.json").toString();
        // if the manifest is actually in the correct format
        if (isJsonString(temp_manifest) && temp_manifest[0] == "[") {
          temp_manifest = JSON.parse(temp_manifest);
          // loops through each thing in the manifest
          for (let file_id in temp_manifest) {
            let file_name = temp_manifest[file_id];
            // if the file exists
            if (fs.existsSync(path + "/" + type + "/" + file_name)) {
              // the file
              let file = fs.readFileSync(path + "/" + type + "/" + file_name);
              // creates the file locally in the data folder
              fs.writeFileSync("data/" + type + "/" + file_name, file);
              // depending on the type, adds it to a different manifest
              switch (type) {
                case "stand":
                  if (manifest_stand.indexOf(file_name) < 0) {
                    manifest_stand.push(file_name);
                  }
                  break;
                case "pit":
                  if (manifest_pit.indexOf(file_name) < 0) {
                    manifest_pit.push(file_name);
                  }
                  break;
                case "notes":
                  if (manifest_notes.indexOf(file_name) < 0) {
                    manifest_notes.push(file_name);
                  }
                  break;
              }
            }
          }
        }
      }
    }
    // writes new json files
    fs.writeFileSync("./data/stand/manifest.json", JSON.stringify(manifest_stand));
    fs.writeFileSync("./data/pit/manifest.json", JSON.stringify(manifest_pit));
    fs.writeFileSync("./data/notes/manifest.json", JSON.stringify(manifest_notes));
    // reloads the page
    window.location.reload();
  }
}

/********************************************/
/*          GETTING DATA FROM TBA           */
/********************************************/

// how many teams have we gotten images from yet
let loaded_images_from_tba = 0;

// TBA setup
const TbaApiV3client = require('tba-api-v3client');
const defaultClient = TbaApiV3client.ApiClient.instance;
const apiKey = defaultClient.authentications['apiKey'];
apiKey.apiKey = fs.readFileSync("tba-api-key.txt").toString();
const team_api = new TbaApiV3client.TeamApi();

// loads photos from TBA for a given team, inspired by 2521's Robot Scouter
function loadMediaFromTBA(team) {
  if (image_data[team] === undefined) { image_data[team] = []; }
  // gets images for a team for a given year
  team_api.getTeamMediaByYear("frc" + team, year, {}, function(error, data, response) {
    if (error) {
      loaded_images_from_tba += 1;
      console.error(error);
    } else {
      for (let img in data) {
        let key = data[img]["foreign_key"];
        let src = undefined;
        switch (data[img]["type"]) {
          case "imgur":
            src = "https://i.imgur.com/" + key + ".png";
            break;
          case "instagram-image":
            src = "https://www.instagram.com/p/" + key + "/media";
            break;
          // no longer works with new ChiefDelphi layout, will be updated later
          // case "cdphotothread":
          //   src = "https://www.chiefdelphi.com/media/img/" + data[img]["details"]["image_partial"];
        }
        // adding it to the manifest and image_data
        if (src !== undefined) {
          if (manifest_images.indexOf(team + "@" + src) < 0) {
            manifest_images.push(team + "@" + src);
          }
          image_data[team].push(src);
        }
      }
      loaded_images_from_tba += 1;
    }
  });
}

// called by insertTeams(), gets list of teams with names from thebluealliance
function insertTeamsWithTBA() {
  for (let team_id in teams) { // for each team
    let team = teams[team_id];
    // gets team name via TBA call
    team_api.getTeam("frc" + team, {}, function(error, data, response) {
      if (error) {
        console.error(error);
      } else {
        team_id_to_name[team] = data["nickname"];
        // inserts team information into the "teams" page
        insertTeam(team);
      }
    });
  }
}

/********************************************/
/*           GETTING ROBOT IMAGES           */
/********************************************/

// gets images for all robots
function getImages() {
  // runs 1540photo.py, which collects images from Gmail
  exec("python 1540photo.py");
  loaded_images_from_tba = 0;
  // for each team, loads media
  for (let team_id in teams) {
    loadMediaFromTBA(teams[team_id]);
  }
  // checks to see if all images are loaded, and saves a manifest if true
  window.setInterval(saveImageManifest, 3000);
}

// saves a manifest.json after loading images
function saveImageManifest() {
  // checks to see if data from all teams have been collected
  if (loaded_images_from_tba == teams.length) {
    fs.writeFileSync("data/images/manifest.json", JSON.stringify(manifest_images));
    // reloads the page afterwards
    window.location.reload();
  }
}

/********************************************/
/*              PAGE HISTORY                */
/********************************************/

// current page user is on
let current_page = "home"
// if on a "team" or "match" page, which team is selected
let selected_team = undefined;

// an array of arrays, representing a stack of all previous pages
// inner arrays are ["page", "team"]
let history = []

// this function changes the page when a button is selected
// team is the selected_team of that page
// direction is positive if we are going forward through history
function switchPages(new_page, team, direction) {
  window.scrollTo(0, 0); // sets the page scroll to its initial state
  $(".page").hide(); // hides all pages, but will show them again later in function
  $("#" + new_page).show(); // shows new page
  if (direction > 0) { history.push([current_page, selected_team]); } // adds page to history if needed
  current_page = new_page;
  selected_team = team;
  // showing/hiding the home/back buttons
  if (history.length == 0) { $(".back").hide(); }
  else { $(".back").show(); }
  if (current_page == "home") { $(".go-to-home").hide(); }
  else { $(".go-to-home").show(); }

  // Team page and match page specifics
  if (current_page == "team") {
    $(".team-title").text(team + " - " + team_id_to_name[team]);
    addData();
  }
  if (current_page == "matches") {
    displayMatchesForTeam(selected_team);
    if (selected_team !== undefined) { $(".matches-team-display").text("Team " + selected_team); }
    else { $(".matches-team-display").text("All Teams"); }
  } else { $(".match-col").html(""); }
}

/********************************************/
/*      CALCULATING SCORES FOR MATCHES      */
/********************************************/
/*             GAME SPECIFIC                */
/********************************************/

// match is an object
// calculates a score for a match
function calculateScore(match) {
  let score = 0;
  // cross line
  if (match["Start"]["Cross Line"] == "1") {
    score += 3;
  } else if (match["Start"]["Cross Line"] == "2") {
    score += 6;
  }
  let climb_score = 0;
  // platform
  if (match["Endgame"]["Platform"] == "level 1") {
    climb_score += 3;
  } else if (match["Endgame"]["Platform"] == "level 2") {
    climb_score += 6;
  } else if (match["Endgame"]["Platform"] == "level 3") {
    climb_score += 12;
  }
  if (match["Endgame"]["Assistance"] == "received") {
    climb_score = 0;
  } else if (match["Endgame"]["Assistance"] == "gave 1") {
    climb_score *= 2;
  } else if (match["Endgame"]["Assistance"] == "gave 2") {
    climb_score *= 3;
  }
  score += climb_score;
  // hatch
  let hatch_vals = ["Hatch Low", "Hatch Mid", "Hatch High"];
  for (let i in hatch_vals) {
    score += (parseInt(match["Teleop"][hatch_vals[i]]) * 2);

  }
  // cargo
  let cargo_vals = ["Cargo Low", "Cargo Mid", "Cargo High"];
  for (let i in cargo_vals) {
    score += (parseInt(match["Teleop"][cargo_vals[i]]) * 3);
  }
  return score;
}

// returns the number of game pieces of a certain type placed in a given match
// type is either Hatch or Cargo
function calculateNumGamePieces(match, type) {
  // game_piece_vals is all the questions we check from the data point
  let game_piece_vals = [type + " Low", type + " Mid", type + " High"];
  let num_pieces = 0;
  for (let i in game_piece_vals) {
    num_pieces += parseInt(match["Teleop"][game_piece_vals[i]]);
  }
  return num_pieces;
}

// calculates all the scores for a team, for each match
// returns an array of thre arrays, [overallScores, numHatchesPerMatch, and numCargoPerMatch]
function calculateScores(team) {
  let team_matches = stand_data[team];
  let overall_scores = []; // an array of each score for each match
  let num_hatches = []; // num of hatch for a match
  let num_cargo = []; // num of cargo for a match
  for (let match_index in team_matches) {
    let match = team_matches[match_index];
    overall_scores.push(calculateScore(match));
    num_hatches.push(calculateNumGamePieces(match, "Hatch"));
    num_cargo.push(calculateNumGamePieces(match, "Cargo"));
  }
  return [overall_scores, num_hatches, num_cargo];
}

/********************************************/
/*                TEAM PAGE                 */
/********************************************/
/*              GAME SPECIFIC               */
/********************************************/

// all the values displayed on a team's table
// game specific
const table_values = ["Cross", "Def", "Hatch", "Cargo", "Stop"];

// all the buttons that appear above the team's table, and the title of each column of their modals
// game specific
const button_values = {
  "hatch": ["match", "low", "mid", "high", "total", "dropped"],
  "cargo": ["match", "low", "mid", "high", "total", "dropped"],
  "climb": ["match", "level", "assistance"]
}

// resets the data in the team page
function resetTeamPage() {
  // erases all previous table data
  $("#indv-team-body").html("");
  // erases all images
  $("#team-image-div").html("");
  $(".carousel-inner").html("");
  $(".carousel-indicators").html("");
  // erases all previous modal data
  let button_values_keys = Object.keys(button_values);
  for (let btn in button_values_keys) {
    let btn_title = button_values_keys[btn];
    $(".tbody-" + btn_title).html("");
  }
  // erases pit data
  $(".tbody-pit").html("");
}

// sets up team pages for data
function setupData() {
  // adding all the columns to the team table
  for (let value in table_values) {
    $("#indv-team-tr").append(`
      <th>` + capitalize(table_values[value]) + `</th>
    `);
  }
  $("#indv-team-tr").append(`
    <th>Score</th>
    <th>Notes</th>
    <th>Data</th>
  `);
  // creating all the buttons above the tables
  let button_values_keys = Object.keys(button_values);
  for (let btn in button_values_keys) {
    createButton(button_values_keys[btn], button_values_keys[btn], button_values[button_values_keys[btn]], "btn-lg btn-primary", "#team-button-div");
  }
  // creates pit data button
  createButton("pit", "Pit Data", ["question", "answer"], "btn-lg btn-danger", "#team-button-div");
  // creates view matches button
  $("#team-button-div").append(`
    <button class="btn btn-lg btn-secondary" onclick="switchPages('matches', selected_team, 1)">View Matches</button>
  `);
}

// adds data to team page
function addData() {
  // resets all info on the page
  resetTeamPage();
  // adds in images
  addImagesToPage();
  // adds in pit data
  addPitDataToPage();
  // adds in stand data
  addStandDataToPage();
  // adding average/mean/max to btn-div (non match-specific)
  addOverallStatsToPage();
  // adds in notes data
  addNotesToPage();
  // view data button functionality
  addDataToViewDataButton();
}


// adds stand data to team page
// game specific
function addStandDataToPage() {
  // loops through each match
  for (let match_id in stand_data[selected_team]) {
    let match = stand_data[selected_team][match_id];
    // the HTML which will be appended to the <tbody>
    let append_html = `<tr><td>` + match["info"]["match"] + `</td>`;
    if (match["Stand"]["Login"] !== undefined) {
      // adds the scout name to the large table
      append_html += `<td class="scout-td">` + scouts[match["Stand"]["Login"]] +`</td>`;
    } else {
      continue; // if there is no scout, the data is discarded (gasp)
    }
    // for each value that is supposed to appear in the table (see table_values)
    for (let value in table_values) {
      // name of the value in array table_values
      let header = table_values[value];
      // what will be displayed
      let display = match[header];
      // for each possible header...
      switch (header) {
        case "Cross":
          display = match["Start"]["Cross Line"];
          break;
        // defense
        case "Def":
          display = match["Teleop"]["Played Defense"][0];
          break;
        // totals up all hatch values
        case "Hatch":
          display = parseInt(match["Teleop"]["Hatch Low"]) + parseInt(match["Teleop"]["Hatch Mid"]) + parseInt(match["Teleop"]["Hatch High"]);
          break;
        // totals up all cargo values
        case "Cargo":
          display = parseInt(match["Teleop"]["Cargo Low"]) + parseInt(match["Teleop"]["Cargo Mid"]) + parseInt(match["Teleop"]["Cargo High"]);
          break;
        case "Stop":
          display = match["Notes"]["Stopped"];
          break;
      }
      // adds it to the html
      append_html += `<td>` + display + `</td>`;
    }
    // adds score to row
    append_html += `<td>` + calculateScore(match, "overall") + `</td>`;
    // adds notes to row
    append_html += `<td id="notes-` + selected_team + `-` + match["info"]["match"] + `">` + match["Notes"]["Notes"] + `</td>`;
    // creates buttons above table
    let button_values_keys = Object.keys(button_values);
    for (let btn in button_values_keys) {
      let btn_title = button_values_keys[btn];
      switch (btn_title) {
        // hatch button
        case "hatch":
          // adds data to hatch button
          addButtonData(btn_title, match["info"]["match"], [
            function() { return match["info"]["match"]; },
            function() { return match["Teleop"]["Hatch Low"]; },
            function() { return match["Teleop"]["Hatch Mid"]; },
            function() { return match["Teleop"]["Hatch High"]; },
            function() {
              return match["Teleop"]["Hatch Low"] + match["Teleop"]["Hatch Mid"] + match["Teleop"]["Hatch High"];
            },
            function() { return match["Teleop"]["Dropped Hatch"]; }
          ]);
          break;
        // cargo button
        case "cargo":
          // adds data to cargo butotn
          addButtonData(btn_title, match["info"]["match"], [
            function() { return match["info"]["match"]; },
            function() { return match["Teleop"]["Cargo Low"]; },
            function() { return match["Teleop"]["Cargo Mid"]; },
            function() { return match["Teleop"]["Cargo High"]; },
            function() {
              return match["Teleop"]["Cargo Low"] + match["Teleop"]["Cargo Mid"] + match["Teleop"]["Cargo High"];
            },
            function() { return match["Teleop"]["Dropped Cargo"]; }
          ]);
          break;
        // climb button
        case "climb":
          // adds dat to climb button
          addButtonData(btn_title, match["info"]["match"], [
            function() { return match["info"]["match"]; },
            function() { return match["Endgame"]["Platform"]; },
            function() { return match["Endgame"]["Assistance"]; }
          ]);
      }
    }
    // where the view button will go
    append_html += `
      <td id="view-data-cell-` + match_id + `"></td>
      </tr>
    `;
    // adds html to body
    $("#indv-team-body").append(append_html);
    // creates view buttons
    createButton("view" + match_id, "&#8594", ["question", "answer"], "btn-success", "#view-data-cell-" + match_id);
  }
}

// adds pit data to the team page
function addPitDataToPage() {
  // pit scouting data
  let pit_data_point = pit_data[selected_team];
  // checks to see if pit data point actually exists
  if (pit_data_point !== undefined) {
    // traverses the pit JSON and runs addButtonData() for each question
    traverseScoutKitJSON(pit_data_point, function(json, p, pi, q, qi) {
      // adds the data to the "Pit Data" button
      addButtonData("pit", pi + "-" + qi, [
        // returns the question
        function() {
          return q;
        },
        // returns the response to the question
        function() {
          let answer = json[p][q];
          // instead of showing sout id, it shows scout name
          if (q == "Scout") {
            answer = scouts[answer];
          }
          return answer;
        }
      ]);
    });
  }
}

// adds overall statistics to buttons
// game specific
function addOverallStatsToPage() {
  // e.g. ["Hatch", "Cargo", "Climb"]
  let button_values_keys = Object.keys(button_values);
  for (let btn in button_values_keys) {
    let btn_title = button_values_keys[btn];
    // calculates scores for all matches
    // [[list of scores], [list of # hatches], [list of # cargo]]
    let overall_scores = calculateScores(selected_team);
    // adds "Mean", "Median", "Maximum", "StDev"
    switch (btn_title) {
      case "hatch":
        addButtonOverallStat(btn_title, "Mean", jStat.mean(overall_scores[1]));
        addButtonOverallStat(btn_title, "Median", jStat.median(overall_scores[1]));
        addButtonOverallStat(btn_title, "Maximum", jStat.max(overall_scores[1]));
        addButtonOverallStat(btn_title, "StDev", jStat.stdev(overall_scores[1]));
        break;
      case "cargo":
        addButtonOverallStat(btn_title, "Mean", jStat.mean(overall_scores[2]));
        addButtonOverallStat(btn_title, "Median", jStat.median(overall_scores[2]));
        addButtonOverallStat(btn_title, "Maximum", jStat.max(overall_scores[2]));
        addButtonOverallStat(btn_title, "StDev", jStat.stdev(overall_scores[2]));
        break;
    }
  }
}

// adds notes to team page
function addNotesToPage() {
  // for each data_point in this team's notes_data
  for (let data_point_index in notes_data[selected_team]) {
    // data_point is new notes to add
    let data_point = notes_data[selected_team][data_point_index];
    // adds a new line
    $("#notes-" + selected_team + "-" + data_point[1]).append("<br>" + data_point[0]);
  }
}

// adds team images to their team page
function addImagesToPage() {
  // number of indicators the carousel currently has
  let num_carousel_indicators = 0;
  // checks to see if there is actually image data for the team
  if (image_data[selected_team] !== undefined) {
    // if so, loops through each image
    for (let image_id in image_data[selected_team]) {
      // src for the image, either a url or local file
      let src = image_data[selected_team][image_id];
      // adds the image
      $(".carousel-inner").append(`
        <div class="carousel-item item item-` + num_carousel_indicators + `">
          <img class="carousel-image" alt="` + selected_team + `" name="` + image_id + `" src="` + src + `" height="250px" />
        </div>
      `);
      // adds the indicator
      $(".carousel-indicators").append(`
        <li data-target="#myCarousel" data-slide-to="` + num_carousel_indicators + `" class="indicator indicator-` + num_carousel_indicators + `"></li>
      `);
      // if this is the first image added, the indicator and image are active
      if (num_carousel_indicators == 0) {
        $(".indicator-" + num_carousel_indicators).addClass("active");
        $(".item-" + num_carousel_indicators).addClass("active");
      }
      num_carousel_indicators += 1;
    }
  }
}

// adds to data to view data button
function addDataToViewDataButton() {
  // loops through each match selected_team was in
  for (let match_id in stand_data[selected_team]) {
    // match is an object
    let match = stand_data[selected_team][match_id];
    // traverses through each question in match and adds result to View Data Button
    traverseScoutKitJSON(match, function(json, page, page_index, question, question_index) {
      // adds data to the View Data Button
      addButtonData("view" + match_id, question_index + "-" + page_index, [
        // returns the question
        function() {
          return question;
        },
        // returns the answer to the question
        function() {
          let answer = match[page][question];
          // instead of returning scout number, return scout name
          if (match[page][question] == "Login") {
            answer = scouts[answer];
          }
          return answer;
        }
      ]);
    });
  }
}

// creates a data button for the team page, with a table in it
// addButtonData() fills in the table
/*
code - the unique code assigned to the button
title - the name of the button
names - the names of columns
btn_classes - extra classes to be applied to the button (e.g. "btn-lg btn-primary")
loc - where the button will be created
*/
function createButton(code, title, names, btn_classes, loc) {
  $(loc).append(`
    <button class="btn ` + btn_classes + ` btn-press-` + code +  `">` + capitalize(title) + `</button>
    <div style="display:none" class="modal modal-` + code + `">
      <div class="modal-content">
        <button class="btn close close-` + code + `">Close</button>
        <br />
        <table class="table modal-table table-hover">
          <thead>
            <tr class="tr-` + code + `">
            </tr>
          </thead>
          <tbody class="tbody-` + code + `">
          </tbody>
        </table>
        <br />
        <button class="btn close close-` + code + `">Close</button>
      </div>
    </div>
  `);
  // for each column name
  for (let name in names) {
    // create a <th> with the name
    $(".tr-" + code).append(`
      <th>` + capitalize(names[name]) + `</th>
    `);
  }
  // makes it so pressing the button triggers the modal
  $(".btn-press-" + code).click(function() {
    $(".modal-" + code).css("display", "block");
  });
  // you can now close the modal!
  $(".close-" + code).click(function() {
    $(".modal").css("display", "none");
  });
}

// adds team-specific data to button
// code is the unique id for the button
// match is the match number (or a unique code for the row)
// obtainValues is a list of functions which obtain values
function addButtonData(code, match, obtainValues) {
  $(".tbody-" + code).append(`<tr class="tr-` + code + `-` + match + `"></tr>`);
  // loops through each value
  for (let f in obtainValues) {
    let value = obtainValues[f]();
    // adds a cell for each column in table, creating a row
    $(`.tr-` + code + `-` + match).append(`
      <td>` + value + `</td>
    `);
  }
}

// adds an overall stat (e.g. median, maximum) "stat_value" to a div with code "code"
function addButtonOverallStat(code, stat_name, stat_value) {
  // rounds to hundredths
  stat_value = roundto100th(stat_value);
  // if there is not a div for holding the stats yet
  if ($(".tbody-btn-div-" + code).length == 0) {
    // creates a div to hold all overall stats
    $(".tbody-" + code).append(`<div class="tbody-btn-div tbody-btn-div-` + code + `"></div>`)
  }
  // adds stat to div previously added
  $(".tbody-btn-div-" + code).append(`
    <input type="button" class="modal-btn" value="` + stat_name + `: ` + stat_value + `" />
  `);
}

// traverses a JSON file put out by ScoutKit (i.e. pit or stand)
// runs "questionFunction" for each question in app
function traverseScoutKitJSON(json, questionFunction) {
  // keys of the function (e.g. ["Sandstorm", "Teleop", "Endgame"])
  let keys = Object.keys(json);
  // traverse through each page in the keys
  for (let page_index in keys) {
    let page = keys[page_index]; // e.g. "Sandstorm"
    let page_keys = Object.keys(json[page]); // e.g. ["Hatch Low", "Hatch Mid", "Hatch High"]
    for (let question_index in page_keys) {
      let question = page_keys[question_index] // e.g. "Weight", "Hatch Low"
      /* runs questionFunction passing
      json - the json file
      page - the page the question was on
      page_index - the unique index of the page
      question - the question
      question_index - the index of the question (unique to the page, but not the json)
      */
      questionFunction(json, page, page_index, question, question_index);
    }
  }
}

// sortTable() function sorts the teams page table after all teams are loaded
// sorts them by team number
function sortTable() {
  if (loaded_teams < teams.length) {
    window.setTimeout(sortTable, 200);
    return;
  }
  fs.writeFileSync("./teams.json", JSON.stringify(team_id_to_name));
  var table, rows, switching, i, x, y, shouldSwitch;
  table = document.getElementById("teams-table");
  switching = true;
  /* Make a loop that will continue until
  no switching has been done: */
  while (switching) {
    // Start by saying: no switching is done:
    switching = false;
    rows = table.rows;
    /* Loop through all table rows (except the
    first, which contains table headers): */
    for (i = 1; i < (rows.length - 1); i++) {
      // Start by saying there should be no switching:
      shouldSwitch = false;
      /* Get the two elements you want to compare,
      one from current row and one from the next: */
      x = rows[i].getElementsByTagName("TD")[0];
      y = rows[i + 1].getElementsByTagName("TD")[0];
      // Check if the two rows should switch place:
      if (parseInt(x.innerHTML.toLowerCase()) > parseInt(y.innerHTML.toLowerCase())) {
        // If so, mark as a switch and break the loop:
        shouldSwitch = true;
        break;
      }
    }
    if (shouldSwitch) {
      /* If a switch has been marked, make the switch
      and mark that a switch has been done: */
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}

/********************************************/
/*                MATCH PAGE                */
/********************************************/


// loc is the location to add the match to
// team is the selected_team
function createMatch(loc, match_number, team) {
  // html to append to loc
  let append_html = `
    <div style="text-align:center">
      <h3>` + match_number + `</h3>
      <div>`;
  // for each team in the match
  for (let team_index in schedule[match_number.toString()]) {
    // e.g. "1540"
    let displayed_team = schedule[match_number.toString()][team_index];
    // classes for the btn
    let btn_type = "btn-danger";
    // if team_index > 2, they are on the blue alliance, hence btn-primary
    if (team_index > 2) { btn_type = "btn-primary"; }
    // if team is our team, make it a different class
    if (displayed_team == OUR_TEAM) { btn_type += " our-team-btn"; }
    // if team is selected_team, make it green but also display-team-btn
    else if (displayed_team == team) { btn_type = "btn-success display-team-btn"; }
    // that btn is about to be appended!
    append_html += `<button class="btn ` + btn_type + ` match-team-btn match-team-btn-` + match_number + `">` + displayed_team + `</button>`;
    // create a new row for the btns for the blue alliance
    if (team_index == 2) { append_html += `</div><div>`; }
  }
  append_html += `</div></div>`;
  // actually adds the html
  $(loc).append(append_html);
  // makes the btn switch pages
  $(".match-team-btn-" + match_number).click(function() {
    switchPages("team", $(this).text(), 1);
  });
}

// display matches for a team
// if "team" is undefined, all teams will be displayed
function displayMatchesForTeam(team) {
  let matches_to_display = [];
  let schedule_keys = Object.keys(schedule);
  // if team is undefined, go through each match
  if (team === undefined) {
    for (let x in schedule_keys) {
      matches_to_display.push(parseInt(x)+1);
    }
  } else {
    // go through each match
    for (let match_index in schedule_keys) {
      let match_number = schedule_keys[match_index];
      let match = schedule[match_number];
      // checks to see if match contains team
      if (match.indexOf(team) >= 0) {
        matches_to_display.push(match_number);
      }
    }
  }
  // display match for each match in matches_to_display
  for (let match_index in matches_to_display) {
    // ".match-col-"+match_index%3 is where the match will be appended, in one of three columns
    createMatch(".match-col-" + match_index % 3, matches_to_display[match_index], team);
  }
}

/********************************************/
/*                STATISTICS                */
/********************************************/
/*               GAME SPECIFIC              */
/********************************************/

// two statistics libraries
const simpleStats = require("simple-statistics");
const jStat = require("jStat").jStat;

// the data present on the "Statistics" page
let stats_data = {
  "1": {
    "name": "",
    "scores": [],
    "hscores": [],
    "cscores": [],
    "score": 0,
    "hatch": 0,
    "cargo": 0
  },
  "2": {
    "name": "",
    "scores": [],
    "hscores": [],
    "cscores": [],
    "score": 0,
    "hatch": 0,
    "cargo": 0
  },
  "teams": 0
}

// updates the stats table once a new team is inputted
function updateStatsTable(team_number, alignment) {
  // team previously inputted
  let prev_team = $(".stats-name-" + alignment).text();
  // the name of team_number
  let next_team = team_id_to_name[team_number];
  // checks to confirm that the input is a number, is a number of a team at the event, and is not the previous team inputted
  if (Number.isInteger(parseInt(team_number)) && teams.indexOf(team_number) >= 0 && prev_team != next_team) {
    // [[overall scores], [num hatches], [num cargo]]
    let data_scores = calculateScores(team_number);
    // in stats_data, sets the team's name, scores, and the means
    stats_data[alignment]["name"] = next_team;
    stats_data[alignment]["scores"] = data_scores[0];
    stats_data[alignment]["hscores"] = data_scores[1];
    stats_data[alignment]["cscores"] = data_scores[2];
    stats_data[alignment]["score"] = simpleStats.mean(data_scores[0]);
    stats_data[alignment]["hatch"] = simpleStats.mean(data_scores[1]);
    stats_data[alignment]["cargo"] = simpleStats.mean(data_scores[2]);
    // no team was previously inputted, thus we should add 1 to the team count
    if (prev_team == "") { stats_data["teams"] += 1; }
    // displays data collected above
    $(".stats-name-" + alignment).text(next_team);
    $(".stats-overall-" + alignment).text(roundto100th(stats_data[alignment]["score"]));
    $(".stats-hatch-" + alignment).text(roundto100th(stats_data[alignment]["hatch"]));
    $(".stats-cargo-" + alignment).text(roundto100th(stats_data[alignment]["cargo"]));
    // confirms that there are two teams to compare
    if (stats_data["teams"] == 2) {
      // calculates and displays the p-value for overall, hatch, and cargo
      displayPValue();
    }
  }
}

// obtains the p-values for the data in stats_data, then diplays in on the "Statistics" page
function displayPValue() {
  // these are p-values from a bunch of two sample t-tests
  let overallResult = getPValue(stats_data["1"]["scores"], stats_data["2"]["scores"]);
  let hatchResult = getPValue(stats_data["1"]["hscores"], stats_data["2"]["hscores"]);
  let cargoResult = getPValue(stats_data["1"]["cscores"], stats_data["2"]["cscores"]);
  // displays them, and gives the cell a background corresponding to the severity of the p-value
  $(".stats-overall-result").text(overallResult).css({ background: color(overallResult) });
  $(".stats-hatch-result").text(hatchResult).css({ background: color(hatchResult) });
  $(".stats-cargo-result").text(cargoResult).css({ background: color(cargoResult) });
}

// does a two sample t test, then uses tcdf() to find the t-value
// takes Honors Statistics with Kenny first to understand this magic
function getPValue(array1, array2) {
  // degrees of freedom
  let df = jStat.min([array1.length - 1, array2.length - 1]);
  // TwoSampleTTest
  let t_val = -Math.abs(simpleStats.tTestTwoSample(array1, array2));
  // tcdf
  let pValue = roundto100th(jStat.studentt.cdf(t_val, df) * 2);
  return pValue;
}

// Determining color based on significance of p-value
function color(sig) {
  if (sig <= 0.01) {
    return 'red';
  } else if (sig <= 0.05) {
    return 'orange';
  } else if (sig <= 0.1) {
    return 'gold';
  } else if (sig <= 0.2) {
    return 'green';
  } else {
    return '';
  }
}

/********************************************/
/*                PICKLISTS                 */
/********************************************/

// current picklists on the picklists page
let picklists = {}

// creates a picklist on the picklist page
function createPicklist() {
  // gets an available picklist index
  let index = findAvailablePicklistID().toString();
  // index will be undefined ONLY IF the maximum picklist limit has been reached (30)
  if (index === undefined) {
    alert("The maximum picklist limit of 30 has been reached!");
    return undefined;
  }
  picklists[index] = [];
  // The code for the picklist
  $(".picklist-container").append(`
    <br class="from-picklist-` + index +`" />
    <div length="0" class="from-picklist-` + index + ` picklist" id="picklist-div-` + index + `">
      <div class="row">
        <div class="col-8">
          <h3 contenteditable="true" class="picklist-content picklist-title" id="picklist-title-` + index + `">Picklist ` + index + `</h3>
        </div>
        <div class="col-2">
          <button class="picklist-content wide-btn btn btn-danger picklist-add-team" id="picklist-add-team-` + index + `">Add Team</button>
        </div>
        <div class="col-2">
          <div class="dropdown">
            <button data-toggle="dropdown" role="button" aria-expanded="false" class="btn btn-dark dropdown-toggle picklist-content wide-btn" type="button">Options</button>
            <div class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenuButton">
              <a class="load-list dropdown-item" id="load-list-` + index + `" href="#">Load Picklist</a>
              <a class="save-list dropdown-item" id="save-list-` + index + `" href="#">Save Picklist </a>
              <a class="delete-list dropdown-item" id="delete-list-` + index + `" href="#">Delete Picklist </a>
            </div>
          </div>
        </div>
      </div>
      <table class="picklist-table picktable-` + index + `" border="0">
        <tbody class="picklist-table-` + index + `">
        </tbody>
      </table>
      <input id="csv-file-loader-` + index + `" hidden type="file" />
    </div>
    <div style="display:none" class="from-picklist-` + index + ` modal modal-picklist-` + index + `">
      <div class="modal-content">
        <input class="modal-input-` + index + `" type="text" value=""/>
        <br />
        <button class="btn close enter enter-picklist-` + index + `">Submit</button>
        <button class="btn close close-picklist-` + index + `">Cancel</button>
      </div>
    </div>
    <div style="display:none" class="from-picklist-` + index + ` modal modal-delete-list-` + index + `">
      <div class="modal-content">
        <h4 class="delete-list-text">Delete List?</h4>
        <br />
        <button class="btn close close-delete close-delete-list-` + index + `">Delete</button>
        <button class="btn close close-picklist-` + index + `">Cancel</button>
      </div>
    </div>
  `);
  // shows the delete list confirmation modal
  // DOES NOT DELETE THE LIST HERE
  $("#delete-list-" + index).click(function() {
    $(".modal-delete-list-" + index).show();
    $(".delete-list-text").text("Delete " + $("#picklist-title-" + index).text() + "?");
  });
  // opens the csv file loader
  $("#load-list-" + index).click(function() {
    $("#csv-file-loader-" + index).trigger("click");
  });
  // loads a picklist after using the file loader
  $("#csv-file-loader-" + index).change(function() {
    let path = document.getElementById("csv-file-loader-" + index).files[0].path;
    loadPicklist(index, path);
  });
  // saves a picklist
  $("#save-list-" + index).click(function() {
    savePicklist(index);
  });
  // opens the team adder modal
  $("#picklist-add-team-" + index).click(function() {
    $(".modal-picklist-" + index).show();
  });
  // deleting a picklist
  $(".close-delete-list-" + index).click(function() {
    deletePicklist(index);
  });
  // adding teams to a picklist
  $(".enter-picklist-" + index).click(function() {
    let team_number = $(".modal-input-" + index).val();
    addTeamToPicklist(index, team_number);
  });
  // selecting cancel to close the modal
  $(".close-picklist-" + index).click(function() {
    $(".modal").css("display", "none");
  });
}

// creates the table of teams in order for the picklist
// index is the picklist index.
// NOTE: this function clears HTML of picklist w/ index
function createPicklistTable(index) {
  // loc is the location (<tbody>) you want to add the table rows to
  let loc = ".picklist-table-" + index;
  // clears html before adding more
  $(loc).html("");
  // gets picklist
  let picklist = picklists[index];
  // goes through each team in order
  for (let team_index in picklist) {
    let team_number = picklist[team_index];
    let team_name = team_id_to_name[team_number];
    // code for the row, with the input box, team name, and delete button
    $(loc).append(`
      <tr>
        <td>
          <input team="` + team_number +`" value="` + (parseInt(team_index) + 1) + `" class="picklist-content picklist-input picklist-input-` + index + `" type="text" />
        </td>
        <td>
          <h5 class="picklist-content">` + team_number + ` - ` + team_name + `</h5>
        </td>
        <td>
          <input team="` + team_number + `" type="button" value="x" class="btn-danger picklist-del-team picklist-del-team-` + index + `"  />
        </td>
      </tr>
    `);
  }
  // deletes the team in question
  $(".picklist-del-team-" + index).click(function() {
    let team_num = $(this).attr("team");
    // deletes team from picklist
    deleteTeamFromPicklist(picklist_index, team_num);
  });
  // triggers when enter key is pressed and input is selected
  $('.picklist-input-' + index).keypress(function (e) {
    // keyCode 13 is "enter"
    if (e.keyCode == 13) {
      let input_val = parseInt($(this).val());
      let team_num = $(this).attr("team");
      // moves the team if able in the picklist
      moveTeamInPicklist(index, team_num, input_val);
    }
  });
}

// adds a team to a picklist
function addTeamToPicklist(picklist_index, team_number) {
  // first condition checks that the team is a team at the event
  // second condition checks that the team is not already in the picklist
  if (teams.indexOf(team_number) >= 0 && picklists[picklist_index].indexOf(team_number) < 0) {
    picklists[picklist_index.toString()].push(team_number);
    createPicklistTable(picklist_index);
  }
  // resets the team input box in the modal
  $(".modal-input-" + picklist_index).val("");
  // hides the modal
  $(".modal").css("display", "none");
}

// saves a picklist to data/picklists as a CSV
function savePicklist(picklist_index) {
  let list_name = $("#picklist-title-" + picklist_index).text();
  // uses regex to remove all characters but letters and numbers
  list_name = list_name.replace(/[^A-Za-z0-9]+/g, '');
  // uses regex to replace commas with newlines, then removes brackets
  let save_file = list_name + "\n" + JSON.stringify(picklists[picklist_index]).replace(/"/g, "").replace(/,/g, "\n").slice(1, -1);
  fs.writeFileSync("./data/picklists/" + list_name + ".csv", save_file);
  alert(list_name + ".csv saved!");
}

// loads a picklist onto the picklist page
// path is the path to the picklist csv
function loadPicklist(picklist_index, path) {
  let csv_file = fs.readFileSync(path).toString();
  // splits file be "\n", the new line character
  let picklist_teams = csv_file.split("\n");
  // gets the picklist title from teams
  // splice automatically removes the title from the list of things
  let picklist_title = picklist_teams.splice(0,1)[0];
  $("#picklist-title-" + picklist_index).text(picklist_title);
  // adds it to the picklists object
  picklists[picklist_index] = picklist_teams;
  createPicklistTable(picklist_index);
}

// deletes a picklist with index picklist_index
function deletePicklist(picklist_index) {
  // deletes picklist from object
  delete picklists[picklist_index];
  // deletes the div, modals, and <br>
  $(".from-picklist-" + picklist_index).remove();
  // closes the modal
  $(".modal").css("display", "none");
}

// deletes a team from the picklist with index "picklist_index"
function deleteTeamFromPicklist(picklist_index, team_number) {
  let picklist = picklists[picklist_index];
  // removes the team from the picklist object
  picklist.splice(picklist.indexOf(team_number), 1);
  // recreates the table
  createPicklistTable(picklist_index);
}

// moves team to a new_location in a picklist
function moveTeamInPicklist(picklist_index, team_number, new_location) {
  let picklist = picklists[picklist_index];
  if (Number.isInteger(new_location)) {
    // removes val from picklist
    picklist.splice(picklist.indexOf(team_number), 1);
    // re-adds to picklist, in new location
    picklist.splice(new_location - 1, 0, team_number);
    // recreates the table
    createPicklistTable(picklist_index);
  }
}

// finds a free unused ID for a new picklist div
// maximum of 30 picklists
function findAvailablePicklistID() {
  let index = 0;
  while (index < 30) {
    // checks to see if ID is taken
    if (picklists[index] === undefined) {
      return index;
    }
    index++;
  }
  console.log("Maximum picklist capacity reached.");
  return undefined;
}

/********************************************/
/*                  MODALS                  */
/********************************************/

// modal clicking
let modals = document.getElementsByClassName("modal");
// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  for (let modal in modals) {
    if (event.target == modals[modal]) {
      $(".modal").css("display", "none");
      return;
    }
  }
}

/********************************************/
/*             MISC. FUNCTIONS              */
/********************************************/

// compares two match objects to see which match came first
function compareByMatch(a,b) {
  return parseInt(a["info"]["match"]) - parseInt(b["info"]["match"]);
}

// from https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// rounds to nearest 100th
function roundto100th(number) {
  return Math.round(parseFloat(number)*100)/100;
}

// checks to see if a string can be parsed into a JSON
// from https://stackoverflow.com/questions/9804777/how-to-test-if-a-string-is-json-or-not
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

//  checks if two arrays are equal
// from https://stackoverflow.com/questions/6229197/how-to-know-if-two-arrays-have-the-same-values
function arraysEqual(_arr1, _arr2) {
    if (!Array.isArray(_arr1) || ! Array.isArray(_arr2) || _arr1.length !== _arr2.length)
      return false;
    var arr1 = _arr1.concat().sort();
    var arr2 = _arr2.concat().sort();
    for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i])
            return false;
    }
    return true;
}


// runs on start
function onStart() {
  // loads manifests, scouts, schedule, etc.
  loadImportantFiles();
  // goes to the home page
  switchPages("home", undefined, 0);
  // determines a list of teams
  determineTeams();
  // uses list of teams to create "Teams" page
  insertTeams();
  // sorts "Teams" table once files are loaded
  window.setTimeout(sortTable, 200);
  // loads scouting data
  loadData();
  // sets up "Team" page for data to be inputted
  setupData();
  // "Picklist" page starts with one picklist
  createPicklist();
  // hides the "Team" page carousel
  $("#myCarousel").hide();
}

$(document).ready(function() {
  // settings buttons
  // start searching for data folder
  // inspired by https://stackoverflow.com/questions/4502612/trigger-file-upload-dialog-using-javascript-jquery
  $(".load-flash-data").click(function() {
    searching = "data";
    $("#dir-loader").trigger("click");
  });
  // start searching for schedule.json
  $(".load-flash-sched").click(function() {
    searching = "schedule";
    $("#file-loader").trigger("click");
  });
  // start searching for scouts.json
  $(".load-flash-scouts").click(function() {
    searching = "scouts";
    $("#file-loader").trigger("click");
  });
  // for files
  $("#file-loader").change(function() {
    let path = document.getElementById("file-loader").files[0].path;
    // loads either the schedule or scouts
    loadFileFromPath();
  });
  // loading data from directories
  $("#dir-loader").change(function() {
    // the path of the data folder
    let path = document.getElementById("dir-loader").files[0].path;
    // copy the data over, then reload the page
    loadDataFromPath(path);
  });
  // whenever we "return" in the text box
  $('.stats-input').keypress(function (e) {
    // keyCode 13 is "enter"
    if (e.keyCode == 13) {
       // whether the team is on the left or right side of table, either 1 or 2
      let alignment = $(this).attr("team");
      let team_number = $(this).val();
      // collects the new information and displays it
      updateStatsTable(team_number, alignment);
    }
  });
  $(".toggle-photos").click(function() {
    $("#myCarousel").toggle();
  });
  // clears data and moves to storage
  // USE AT YOUR OWN RISK
  $(".clear-data").click(function() {
    fs.copySync("./data", "./data-storage/" + comp);
    fs.copySync("./data-empty", "./data");
    window.location.reload();
  });
  // exports data to CSV
  $(".export-data").click(function() {
    exportDataToCSV();
  });
  // a button on the home screen
  $(".home-btn").click(function() {
    let name = $(this).attr("name");
    switchPages(name, undefined, 1);
  });
  // go to home page
  $(".go-to-home").click(function() {
    switchPages("home", undefined, 1);
  });
  // go back one page
  $(".back").click(function() {
    let last_page = history.pop();
    switchPages(last_page[0], last_page[1], -1);
  });
  // view all matches
  $(".all-matches-btn").click(function() {
    switchPages("matches", undefined, 1);
  });
  // view our matches
  $(".our-matches-btn").click(function() {
    switchPages("matches", OUR_TEAM, 1);
  });
  // add a picklist
  $(".add-picklist").click(function() {
    createPicklist();
  });
  // download Gmail photos and TBA photos
  $(".download-external-photos").click(function() {
    getImages();
  });
  // does the things that must be done at the start
  onStart();
});
