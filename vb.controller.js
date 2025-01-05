const TEAMROW = `
<td class="btn show" onclick="matchPage.show({{ID}})"></td>
<td class="btn rename" onclick="clubPage.renameTeam({{ID}})"></td>
<td>{{ROW}}.</td>
<td name="team-name">{{NAME}}</td>
<td name="team-count">{{COUNT}}</td>
<td class="btn delete" onclick="clubPage.removeTeam({{ID}})"></td>
`;

const MEMBERROW = `
<td class="btn rename" onclick="clubPage.editMember({{ID}})"></td>
<td>{{ROW}}.</td>
<td>{{NAME}}</td>
<td>{{NUMBER}}</td>
<td class="btn change" onclick="clubPage.toggleTeam({{ID}})"></td>
<td>{{TEAM}}</td>
<td class="btn delete" onclick="clubPage.removeMember({{ID}})"></td>
`;

const MATCHROW = `
<td>{{ROW}}.</td>
<td>{{NAME}}</td>
<td>{{NUMBER}}</td>
<td>{{ROLES}}</td>
`;

const MATCHPLAYER = `<span>{{NUMBER}}</span><span>{{NAME}}</span>\n`;

const TEAMOPTION = '<option value="{{ID}}">{{NAME}}</option>\n';

const POSTABLE = [
    {row: '75%', col: '83%'},
    {row: '25%', col: '83%'},
    {row: '25%', col: '50%'},
    {row: '25%', col: '17%'},
    {row: '75%', col: '17%'},
    {row: '75%', col: '50%'},
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

    enableButton(selector, value) {
        var btn = query(selector);
        btn.disabled = !value;
        btn.classList.toggle('btn-disable', !value);
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

    static updateContainer(container, elementTag, models, updateRow, elementClass=null) {
        container.innerHTML = '';
        for (let model of models) {
            const element = document.createElement(elementTag);
            element.model = model;
            element.id = `${container.id}-${model.id}`;
            if (elementClass !== null)
                element.classList.add(elementClass);
            container.appendChild(element);
            updateRow(element, model);
        }
    }

    static updateTeamRow(element, model) {
        element.innerHTML = repl(TEAMROW, [
            'ID',       model.id.toString(),
            'ROW',      (element.rowIndex+1).toString(),
            'COUNT',    model.members.length.toString(),
            'NAME',     model.name
        ]);
    }

    static updateMemberRow(element, model) {
        element.innerHTML = repl(MEMBERROW, [
            'ID',       model.id.toString(),
            'ROW',      (element.rowIndex+1).toString(),
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

    }

    onClubChange(event) {
        switch (event.change) {
        case 'name':
            query('#club-name').innerHTML = event.model.name;
            break;
        case 'teams-added':
            event.subject.register((e)=>this.onTeamChange(e));            
        case 'teams-removed':
            Page.updateContainer(this.teamsTable, 'tr', this.club.teams, Page.updateTeamRow);
            break;
        case 'members-added':
            event.subject.register((e)=>this.onMemberChange(e));
        case 'members-removed':
            Page.updateContainer(this.membersTable, 'tr', this.club.members, Page.updateMemberRow);
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
        Page.updateContainer(this.teamsTable, 'tr', this.club.teams, Page.updateTeamRow);
        Page.updateContainer(this.membersTable, 'tr', this.club.members, Page.updateMemberRow);
        super.show();
    }
    
    renameClub() {
        Page.singleValueDialog('Sportverein', 'Name',
            ()=> this.club.name,
            (value)=> this.club.name = value);
    }

    renameTeam(teamId) {
        var team = this.club.teams.byId(teamId);
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

    editMember(teamId) {
        const member        = this.club.members.byId(teamId);
        const dialog        = query('#dlg-edit-member');
        const nameInput     = query('#dlg-edit-member [name="name-input"]');
        const numberInput   = query('#dlg-edit-member [name="number-input"]');
        const teamSelect    = query('#dlg-edit-member [name="team-select"]');
        const yearInput     = query('#dlg-edit-member [name="year-input"]');
        const genderSelect  = query('#dlg-edit-member [name="gender-select"]');
        const rolesInput    = query('#dlg-edit-member [name="roles-input"]');
        const okButton      = query(`#dlg-edit-member [name="button-ok"]`);
        const cancelButton  = query(`#dlg-edit-member [name="button-cancel"]`);
        const okHandler = () => {
            member.name     = nameInput.value;
            member.number   = numberInput.value.trim() == '' ? null : parseInt(numberInput.value);
            member.team     = teamSelect.value == '' ? null : this.club.teams.byId(teamSelect.value); 
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

 }

class MatchPage extends Page {

    constructor(id, clubPage) {
        super(id, clubPage.club);
        this._clubPage = clubPage;
    }

    show(teamId) {
        var team = this.club.teams.byId(teamId);
        var match = this.club.createMatch(team);
        match.clockEnable = true;
        this.playersContainer.innerHTML = '';
        this.courtContainer.innerHTML = '';
        query('#team-name').innerHTML = match.name;
        Page.updateContainer(this.membersContainer, 'tr', match.team.members, Page.updateMatchRow);
        Page.updateContainer(this.playersContainer, 'div', match.players,  MatchPage.updateBenchMember, 'player');
        this.benchPlayers = document.querySelectorAll('#match-bench > div');
        this.benchPlayers.forEach((element)=>{
            element.setAttribute('draggable', 'true');
            element.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', element.model.id);
                e.dataTransfer.effectAllowed = 'move';
            });
        });
        this.enableButton('#btn-match-back', true);
        this.showButtons(false);
        this.showDropZone(true);
        match.register((e)=>this.onMatchChange(e));

        for (let player of match.players)
            player.register(e=>this.onPlayerChange(e));        

        super.show();
    }
    
    bindView() {

        this.membersContainer = query('#match-members');
        this.playersContainer = query('#match-bench');
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
            this.showDropZone(!e.model.running);
            this.showStartStop(e.model.running);
            if (this.club.match.running)
                query('#btn-startstop').style.backgroundImage = 'url(img/stop.svg)';
            this.enableButton('#btn-match-back', !e.model.running);
            this.log(e.model.running ? 'Spiel gestartet' : 'Spiel beendet');
            break;
        case 'startingsix':
            var count = this.club.match.countStartingSix();
            var complete = count == 6;
            this.showButtons(complete);
            this.showRotationButtons(complete);
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
        ]);
    }

    onPlayerChange(event) {
        switch(event.change) {
        case 'place':
            let element = query(`#match-bench-${event.model.id}`);
            let container = null;
            switch(event.model.place) {
            case 'bench':
                container = query('#match-bench');
                container.appendChild(element);
                element.classList.remove('active-player');
                break;
            case 'court':
                container = query('#match-court');
                container.appendChild(element);
                element.classList.add('active-player');
                break;
            }
            
            break;
        case 'startingpos':
            if (this.club.match.running) {
            } else {
                let element = query(`#match-bench-${event.model.id}`);
                let startingPos = event.model.startingPos;
                if (startingPos !== null) {
                    element.style.left = POSTABLE[startingPos].col;
                    element.style.top = POSTABLE[startingPos].row;    
                }
            }
            break;
        }    
    }

    showButtons(visible) {
        document.querySelectorAll('#match-grid .match-rpanel .btn').forEach((btn) => {
            btn.style.visibility = visible ? 'visible' : 'hidden';
        });
    }

    showDropZone(visible) {
        query('#match-grid').style.backgroundImage =
            visible ? 'url(img/court-zone.svg),url(img/court.svg)' 
                    : 'url(img/court.svg)';
    }

    showStartStop(running) {
        query('#btn-startstop').style.backgroundImage = running ? 'url(img/stop.svg)' : 'url(img/start.svg)';
    }

    updateRotation() {
        for (let player of this.club.match.players) {
            if (player.place == 'court') {
                let element = query(`#match-bench-${player.id}`);
                element.style.left = POSTABLE[player.position].col;
                element.style.top = POSTABLE[player.position].row;
            }
        }
        query('#match-rotation > div:nth-child(2)').innerHTML = this.club.match.rotation;
    }

    showRotationButtons(visible) {
        query('#btn-rotate-forward').style.visibility = visible ? 'visible' : 'hidden';
        query('#btn-rotate-backward').style.visibility = visible ? 'visible' : 'hidden';        
    }

    updateClockPanel() {
        query('#display-clock').innerHTML = this.club.match.clockString;
        if (this.club.match.running)
            query('#display-watch').innerHTML = this.club.match.watchString;
    }

    log(line) {
        var logElement = query('#match-log');
        logElement.innerHTML = line;
        logElement.style.visibility = 'visible';
        setTimeout(()=> {
            logElement.style.visibility = 'hidden';
         }, 2000);
    }

}
