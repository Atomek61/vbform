const TEAMROW = `
<div class="btn show" onclick="matchPage.show({{ID}})"></div>
<div class="btn edit" onclick="clubPage.renameTeam({{ID}})"></div>
<div>{{ROW}}.</div>
<div name="team-name">{{NAME}}</div>
<div name="team-count">{{COUNT}}</div>
<div class="btn delete" onclick="clubPage.removeTeam({{ID}})"></div>
`;

const MEMBERROW = `
<div class="btn edit" onclick="clubPage.editMember({{ID}})"></div>
<div>{{ROW}}.</div>
<div>{{NAME}}</div>
<div>{{NUMBER}}</div>
<div class="btn change" onclick="clubPage.toggleTeam({{ID}})"></div>
<div>{{TEAM}}</div>
<div class="btn delete" onclick="clubPage.removeMember({{ID}})"></div>
`;

const MATCHROW = `
<td>{{ROW}}.</td>
<td>{{NAME}}</td>
<td>{{NUMBER}}</td>
<td>{{ROLES}}</td>
`;

const MATCHPLAYER = `<div>{{NUMBER}}</div><div>{{NAME}}</div><div>{{ROLES}}</div>\n`;

const TEAMOPTION = '<option value="{{ID}}">{{NAME}}</option>\n';

const POSTABLE = [
    {row: '75%', col: '83.3%'},
    {row: '25%', col: '83.3%'},
    {row: '25%', col: '50%'},
    {row: '25%', col: '17%'},
    {row: '75%', col: '17%'},
    {row: '75%', col: '50.6%'},
];

function query() {
    if (arguments.length == 1) {
        if (typeof arguments[0] === 'string')
            // query(selector)
            return document.querySelector(arguments[0]);
        else
            // query(id)
            return document.getElementById(arguments[0].toString());
    } else {
        // query(container, modelId)
        return document.getElementById(`${arguments[0].id}-${arguments[1].id}`);
    }
}

function repl(template, list) {
    let result = template;
    for (let i=0; i<list.length; i += 2)
        result = result.replaceAll(`{{${list[i]}}}`, list[i+1]);
    return result;
}

class Page {

    static visiblePage = null;

    constructor(id, club) {
        this.container = query(id);
        this.club = club;
        this.bindView();
    }

    show() {
        if (Page.visiblePage !== null)
            Page.visiblePage.hide();	
        Page.visiblePage = this;
        Page.visiblePage.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    enableButtons(selectors, value) {
        if (Array.isArray(selectors))
            for (let selector of selectors)
                this.enableButtons(selector, value);
        else {
            let btn = query(selectors);
            btn.disabled = !value;
            btn.classList.toggle('btn-disable', !value);
        }
    }

    static singleValueDialog(title, prompt, getter, setter) {
        query('#dlg-single-value h1').innerHTML = title;
        const dialog = query('#dlg-single-value');
        const label = query('#dlg-single-value [for="user-input"]');
        const input = query('#dlg-single-value [name="user-input"]');
        const okButton = query('#dlg-single-value [name="button-ok"]');
        const cancelButton = query('#dlg-single-value [name="button-cancel"]');
        const okHandler = () => {
            setter(input.value)
            dialog.close();
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
        };
        const cancelHandler = () => {
            dialog.close();
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
        };
        okButton.addEventListener('click', okHandler);
        cancelButton.addEventListener('click', cancelHandler);
        label.innerHTML = prompt;
        input.value = getter();
        dialog.showModal();
    }

    static buildTable(container, models, updateRow, rowClass=null) {
        container.innerHTML = '';
        let row = 1;
        for (let model of models) {
            const element = document.createElement('div');
            element.model = model;
            element.rowNumber = row;
            element.id = `${container.id}-${model.id}`;
            if (rowClass !== null) {
                if (Array.isArray(rowClass)) {
                    rowClass.forEach(cls => element.classList.add(cls));
                } else {
                    element.classList.add(rowClass);
                }
            }
            container.appendChild(element);
            updateRow(element, model);
            row++;
        }
    }

    static updateTeamRow(element, model) {
        element.innerHTML = repl(TEAMROW, [
            'ID',       model.id.toString(),
            'ROW',      element.rowNumber.toString(),
            'COUNT',    model.members.length.toString(),
            'NAME',     model.name
        ]);
    }

    static updateMemberRow(element, model) {
        element.innerHTML = repl(MEMBERROW, [
            'ID',       model.id.toString(),
            'ROW',      element.rowNumber.toString(),
            'NAME',     model.name,
            'NUMBER',   model.numberString,
            'TEAM',     model.team === null ? '' : model.team.name	
        ]);
    }

    static updateMatchRow(element, model) {
        element.innerHTML = repl(MATCHROW, [
            'ID',       model.id.toString(),
            'ROW',      (element.rowIndex+1).toString(),
            'ROLES',    model.roles,	
            'NAME',     model.name,
            'NUMBER',   model.numberString,
        ]);
    }
}

class ClubPage extends Page {

    bindView() {

        this.membersTable = query('#members');
        this.teamsTable = query('#teams');

        // Bind model events
        this.club.register((e)=>this.onClubChange(e));

        for (let team of this.club.teams)
            team.register((e)=>this.onTeamChange(e));

        for (let member of this.club.members)
            member.register((e)=>this.onMemberChange(e));

        document.body.addEventListener('fullscreenchange', (e) => {
            let isFullscreen = document.fullscreenElement === null;
            let btn = query('#btn-fullscreen');
            if (isFullscreen)
                btn.classList.replace('shrink-screen', 'full-screen');
            else
                btn.classList.replace('full-screen', 'shrink-screen');
        })


    }

    onClubChange(event) {
        switch (event.change) {
        case 'name':
            query('#club-name').innerHTML = event.model.name;
            break;
        case 'teams-added':
            event.subject.register((e)=>this.onTeamChange(e));            
        case 'teams-removed':
            Page.buildTable(this.teamsTable, this.club.teams, Page.updateTeamRow, 'team-row');
            break;
        case 'members-added':
            event.subject.register((e)=>this.onMemberChange(e));
        case 'members-removed':
            Page.buildTable(this.membersTable, this.club.members, Page.updateMemberRow, 'member-row');
            break;
        }
    }

    onTeamChange(event) {
        if (event.change == 'deleting') return;
        Page.updateTeamRow(query(this.teamsTable, event.model), event.model);
    //    if (event.change == 'name')
        for (let model of event.model.members)
            Page.updateMemberRow(query(this.membersTable, model), model);
    }

    onMemberChange(event) {
        if (event.change == 'deleting') return;
        Page.updateMemberRow(query(this.membersTable, event.model), event.model);
    }

    show() {
        query('#club-name').innerHTML = this.club.name;
        Page.buildTable(this.teamsTable, this.club.teams, Page.updateTeamRow, 'team-row');
        Page.buildTable(this.membersTable, this.club.members, Page.updateMemberRow, 'member-row');
        super.show();
    }

    toggleFullscreen() {
        if (document.fullscreenElement)
            document.exitFullscreen();
        else
            document.body.requestFullscreen();
    }
    
    renameClub() {
        Page.singleValueDialog('Sportverein', 'Name',
            ()=> this.club.name,
            (value)=> this.club.name = value);
    }

    renameTeam(teamId) {
        let team = this.club.teams.byId(teamId);
        Page.singleValueDialog('Mannschaft', 'Name',
            ()=> team.name,
            (value)=>{
                team.name = value
            });
    }

    removeTeam(teamId) {
        this.club.removeTeam(this.club.teams.byId(teamId));
    }

    toggleTeam(memberId) {
        const member = this.club.members.byId(memberId);
        if (this.club.teams.length == 0) return;
        if (member.team === null)
            member.team = this.club.teams.byIndex(0);
        else {
            const index = this.club.teams.indexOf(member.team) + 1;
            if (index == this.club.teams.length)
                member.team = null;
            else
                member.team = this.club.teams.byIndex(index);
        }
    }

    createMember() {
        let member = this.club.createMember();
        this.editMember(member.id);
    }

    editMember(memberId) {
        const member        = this.club.members.byId(memberId);
        const dialog        = query('#dlg-edit-member');
        const nameInput     = query('#dlg-edit-member [name="name-input"]');
        const numberInput   = query('#dlg-edit-member [name="number-input"]');
        const teamSelect    = query('#dlg-edit-member [name="team-select"]');
        const positionInput = query('#dlg-edit-member [name="position-input"]');
        const yearInput     = query('#dlg-edit-member [name="year-input"]');
        const genderSelect  = query('#dlg-edit-member [name="gender-select"]');
        const rolesInput    = query('#dlg-edit-member [name="roles-input"]');
        const okButton      = query(`#dlg-edit-member [name="button-ok"]`);
        const cancelButton  = query(`#dlg-edit-member [name="button-cancel"]`);
        const okHandler = () => {
            member.name     = nameInput.value;
            member.number   = numberInput.value.trim() == '' ? null : parseInt(numberInput.value);
            member.team     = teamSelect.value == '' ? null : this.club.teams.byId(teamSelect.value); 
            member.position = positionInput.value == '' ? null : parseInt(positionInput.value)-1;
            member.year     = yearInput.value;
            member.gender   = genderSelect.value;
            member.roles    = rolesInput.value;
            dialog.close();
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
        };
        const cancelHandler = () => {
            dialog.close();
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
        };

        nameInput.value = member.name;
        numberInput.value = member.number === null ? '' : member.number.toString();
        let html = repl(TEAMOPTION, ['ID', '', 'NAME', '(kein Team)' ]);
        for (let team of this.club.teams)
             html += repl(TEAMOPTION, ['ID', team.id, 'NAME', team.name]);
        teamSelect.innerHTML = html;
        teamSelect.value = member.team === null ? '' : member.team.id.toString();
        positionInput.value = member.position === null ? '' : member.position + 1;
        yearInput.value = member.year;
        genderSelect.value = member.gender;
        rolesInput.value = member.roles;
        okButton.addEventListener('click', okHandler);
        cancelButton.addEventListener('click', cancelHandler);
        dialog.showModal();
    }

    removeMember(memberId) {
        this.club.removeMember(this.club.members.byId(memberId));
    }

    new() {
        this.club.clear();
    }

    save(filename) {
        const blob = new Blob([this.club.asJSON], { type: "application/json" });
        const url = URL.createObjectURL(blob);       
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "data.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    open() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();
        
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    this.club.loadFrom(json);
                } catch (error) {
                    console.log(error);
                }
            };
        
            reader.onerror = (error) => console.log(error);
            reader.readAsText(file);
        };
        
        input.click();
    }

 }

class MatchPage extends Page {

    constructor(id, clubPage) {
        super(id, clubPage.club);
        this._clubPage = clubPage;
    }

    show(teamId) {
        let team = this.club.teams.byId(teamId);
        let match = this.club.createMatch(team);
        match.clockEnable = true;
        query('#match-title').innerHTML = team.name 
        this.courtContainer.innerHTML = '';
        Page.buildTable(this.playersContainer, match.players,  MatchPage.updateBenchMember, ['player', 'on-bench']);
        this.benchPlayers = document.querySelectorAll('#bench > div');
        this.benchPlayers.forEach((element)=>{
            element.setAttribute('draggable', 'true');
            element.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', element.model.id);
                e.dataTransfer.effectAllowed = 'move';
            });
        });
        this.enableButtons('#btn-match-back', true);
        this.enableButtons(['#btn-save-startingsix', '#btn-rotate-forward', '#btn-rotate-backward', '#btn-startstop'], false);
        this.showCourtPositions(true);
        match.register((e)=>this.onMatchChange(e));

        for (let player of match.players) {
            player.register(e=>this.onPlayerChange(e));        
            if (player.member.position !== null)
                player.startingPos = player.member.position;     
        }

        super.show();
    }
    
    bindView() {

        this.playersContainer = query('#bench');
        this.courtContainer = query('#match-court');     

        this.courtContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        this.courtContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const id = parseInt(e.dataTransfer.getData('text/plain'));
            const player = this.club.match.players.byId(id);
            player.startingPos = this.dropEventToPosition(e);
        });

    }

    hide() {
        this.club.match.clockEnable = false;
        super.hide();
    }

    back() {
        if (!this.club.match.running)
            this._clubPage.show();
    }

    onMatchChange(e) {
        switch(e.change) {
        case 'running':
            this.showCourtPositions(!e.model.running);
            this.showStartStop(e.model.running);
            if (this.club.match.running)
                query('#btn-startstop').style.backgroundImage = 'url(img/stop.svg)';
            this.enableButtons('#btn-match-back', !e.model.running);
            this.log(e.model.running ? 'Spiel gestartet' : 'Spiel beendet');
            break;
        case 'startingsix':
            let count = this.club.match.countStartingSix();
            let complete = count == 6;
            this.enableButtons(['#btn-save-startingsix', '#btn-rotate-forward', '#btn-rotate-backward', '#btn-startstop'], complete);
            //this.showRotationButtons(complete);
            this.log(complete ? `Mannschaft komplett` : `Mannschaft unvollständig - es fehlen ${6 - count}`);
            break;
        case 'rotation':
            this.updateRotation();
            break;
        case 'clock':
            this.updateClockPanel();
            break;
        case 'log':
            this.showLogLine(this.club.match.log);
            break;    
        }
    }

    dropEventToPosition(e) {
        let cr = this.courtContainer.getBoundingClientRect();
        let x = (e.clientX - cr.left)/cr.width;
        let y = (e.clientY - cr.top)/cr.height;
        let col = Math.floor(x*3);
        let row = Math.floor(y*2);
        switch(row) {
        case 0:
            switch(col) {
            case 0: return 3;
            case 1: return 2;
            case 2: return 1;
            }
        case 1:
            switch(col) {
            case 0: return 4;
            case 1: return 5;
            case 2: return 0;
            }
        }
        return null
    }

    static updateBenchMember(element, player) {
        element.innerHTML = repl(MATCHPLAYER, [
            'ID',       player.id.toString(),
            'NAME',     player.member.name,
            'NUMBER',   player.member.numberString,
            'ROLES',    player.member.roles === null ? '' : player.member.roles,
        ]);
    }

    onPlayerChange(event) {
        switch(event.change) {
        case 'place':
            let element = query(`#bench-${event.model.id}`);
            let container = null;
            switch(event.model.place) {
                case 'bench':
                container = query('#bench');
                container.appendChild(element);
                element.classList.replace('on-court', 'on-bench');
                break;
            case 'court':
                container = query('#match-court');
                container.appendChild(element);
                element.classList.replace('on-bench', 'on-court');
                break;
            }
            break;
        case 'startingpos':
            if (this.club.match.running) {
            } else {
                let element = query(`#bench-${event.model.id}`);
                let startingPos = event.model.startingPos;
                if (startingPos !== null) {
                    element.style.left = POSTABLE[startingPos].col;
                    element.style.top = POSTABLE[startingPos].row;    
                }
            }
            break;
        }    
    }

    // showButtons(selectors, visible) {
    //     for (let selector of selectors)
    //         if (visible)
    //             query(selector).classList.replace('btn')


    //     document.querySelectorAll('#match-grid .match-rpanel .btn').forEach((btn) => {
    //         if (visible)
    //             btn.classList.remove('btn-disable');
    //         else
    //             btn.classList.add('btn-disable');
    //     });
    // }

    showCourtPositions(visible) {
        query('.court-positions').style.display =
            visible ? 'block' 
                    : 'none';
    }

    showStartStop(running) {
        query('#btn-startstop').style.backgroundImage = running ? 'url(img/stop.svg)' : 'url(img/start.svg)';
    }

    updateRotation() {
        for (let player of this.club.match.players) {
            if (player.place == 'court') {
                let element = query(`#bench-${player.id}`);
                element.style.left = POSTABLE[player.position].col;
                element.style.top = POSTABLE[player.position].row;
            }
        }
        query('#match-rotation > div:nth-child(2)').innerHTML = this.club.match.rotation;
    }

    updateClockPanel() {
        query('#display-clock').innerHTML = this.club.match.clockString;
        if (this.club.match.running)
            query('#display-watch').innerHTML = this.club.match.watchString;
    }

    saveStartingSix() {
        this.club.match.saveStartingSix();
        this.log('Startformation gespeichert');
    }

    log(line) {
        let logElement = query('#match-log');
        logElement.innerHTML = line;
        logElement.style.visibility = 'visible';
        setTimeout(()=> {
            //logElement.style.visibility = 'hidden';
         }, 2000);
    }

}
