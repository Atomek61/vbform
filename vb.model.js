//
// When a model is entangled with another one, and this entanglement is to be deleted, then our model has to
// unbind its binding first, then the other model is to be unbound. Remember:
//  1. first handle myself
//  2. then handle the other one
//

class Model {

    #observers;

    static _newId = 1000;

    static newId() {
        return Model._newId++;
    }       

    constructor(name) {
        this._id = Model.newId();
        this._name = name;
        this.#observers = []
     }

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        if (value==this._name) return;
        this._name = value;
        this.changed('name');
    }

    changed(change, subject = null) {
        let event = {model: this, change: change, subject: subject};
        for (let observer of this.#observers)
            observer(event);
    }

    register(observerFn) {
        this.#observers.push(observerFn)
    }

    unregister(observerFn) {
        let index = this.#observers.indexOf(observerFn);
        if (index != -1)
            this.#observers.splice(index, 1);
    }

    readProp(container, name, defaultValue) {
        return name in container ? container[name] : defaultValue;
    }

    storeTo(container) {
        container.name = this._name;
    }

    loadFrom(container) {
        this._name = this.readProp(container, 'name', null);
    }

}

class ModelArray extends Model {

    constructor(owner, name) {
        super(name);
        this._owner = owner;
        this._models = new Array();
    }

    get owner() {
        return this._owner;
    }

    byIndex(index) {
        return index>=0 && index<this._models.length ? this._models[index] : null;
    }    

    byId(id) {
        return this._models.find((model)=>model.id == id);
    }

    [Symbol.iterator]() {
        let index = 0;
        const models = this._models;

        return {next() {return index < models.length ? {value: models[index++], done: false} : {done: true};}};
    }

    get length() {
        return this._models.length;
    }

    indexOf(model) {
        return this._models.indexOf(model);
    }

    find(filter) {
        return this._models.find(filter);
    }

    add(model) {
        let index = this._models.indexOf(model);
        if (index!=-1) return this._models[index];
        this._models.push(model);
        this.owner.changed(`${this.name}-added`, model);
        return model;
    }

    remove(model) {
        let index = this._models.indexOf(model);
        if (index!=-1) {
            this._models.splice(index, 1);
            this._owner.changed(`${this.name}-removed`, model);
        }
    }

    clear() {
        while (this._models.length>0)
            this.remove(this._models[0]);
    }

}

class Club extends Model {
    
    constructor() {
        super('');
        this._teams = new ModelArray(this, 'teams');
        this._members = new ModelArray(this, 'members');
        this._match = null;
    }

    get teams() {
        return this._teams;
    }

    get members() {
        return this._members;
    }

    get match() {
        return this._match;
    }

    clear() {
        this.name = '';	
        this._teams.clear();
        this._members.clear();
    }

    createTeam(name = null) {
        return this._teams.add(new Team(name===null ? this.name + ' ' + (this._teams.length+1) : name));
    }

    removeTeam(team) {
        while  (team.members.length>0)
            team.members.byIndex(0).team = null;
        this._teams.remove(team);
    }

    findTeam(name) {
        let result = this._teams.find((team)=>team.name == name);
        return result == 'undefined' ? null : result;
    }

    createMember(name = null, number = null) {
        var member = this._members.add(new Member(this, name));
        member.number = number == null ? this.firstFreeNumber() : number;
        return member;
    }

    removeMember(member) {
        member.team = null;
        this._members.remove(member);
    }

    firstFreeNumber() {
        let numbers = new Array();
        for (let member of this._members)
            if (member.number !== null)
                numbers.push(member.number);
        numbers.sort((a, b) => a>b);
        let n1 = 1;
        for (let n of numbers) {
            if (n != n1)
                return n1;
            n1 = n+1;
        }
        return n1;
    }

    createMatch(team) {
        this._match =  new Match('Neues Spiel', team);
        return this._match;
    }

    storeTo(container){
        super.storeTo(container);       
        container.members = new Array();
        for (let member of this._members) {
            let membercontainer = new Object();
            member.storeTo(membercontainer);
            container.members.push(membercontainer);
        }
        container.teams = new Array();
        for (let member of this._teams) {
            let membercontainer = new Object();
            member.storeTo(membercontainer);
            container.teams.push(membercontainer);
        }
    }

    loadFrom(container) {
        super.loadFrom(container);
        this._members.clear();
        this._teams.clear();
        for (let store of container.teams)
            this.createTeam(store.name)
        for (let store of container.members) {
            this.createMember(store.name, store.number).team = this.findTeam(store.team);
        }
    }

    set asCookie(cookie) {
        let cookies = cookie.split(';');
        for (let pair of cookies) {
            let cookie = pair.split('=');
            if (cookie[0] == 'vbclub100') {
                this.loadFrom(JSON.parse(cookie[1]));
                return;    
            }
        }
    }

    get asCookie() {
        let container = new Object();
        this.storeTo(container);
        let json = JSON.stringify(container);
        let retention = new Date();
        retention.setTime(retention.getTime() + (365*24*60*60*1000));
        return `vbclub100=${json};expires=${retention.toUTCString()};path=/`;
//        return `vbclub100=${json};expires=${retention.toUTCString()};SameSite=true;secure=false;`;
    }

    loadW0809() {

        this.clear();

        this.name = 'Wiker SV';
        let team1 = this.createTeam('Wik 1');
        let team2 = this.createTeam('Wik 2');

        // List of example players
        this.createMember('').loadFrom({name: 'Emmy', number: 3, team: 'Wik 2', year: 2008, gender: 'w', roles: 'M'});        
        this.createMember('').loadFrom({name: 'Karli', number: 10, team: 'Wik 1', year: 2008, gender: 'w', roles: 'M'});        
        this.createMember('').loadFrom({name: 'Juliana', number: 23, team: 'Wik 1', year: 2010, gender: 'w', roles: 'AM'});        
        this.createMember('').loadFrom({name: 'Zoe', number: 27, team: 'Wik 2', year: 2010, gender: 'w', roles: 'AM'});        
        this.createMember('').loadFrom({name: 'Marlie', number: 8, team: 'Wik 2', year: 2009, gender: 'w', roles: 'AZ'});        
        this.createMember('').loadFrom({name: 'Lea', number: 1, team: 'Wik 2', year: 2010, gender: 'w', roles: 'AZL'});        
        this.createMember('').loadFrom({name: 'Maike', number: 14, team: 'Wik 2', year: 2008, gender: 'w', roles: 'AM'});        
        this.createMember('').loadFrom({name: 'Ivyna', number: 18, team: 'Wik 1', year: 2009, gender: 'w', roles: 'MA'});        
        this.createMember('').loadFrom({name: 'Juliana', number: 26, team: 'Wik 2', year: 2008, gender: 'w', roles: 'AM'});        
        this.createMember('').loadFrom({name: 'Hedwig', number: 24, team: 'Wik 2', year: 2010, gender: 'w', roles: 'M'});        
        this.createMember('').loadFrom({name: 'Theresa', number: 16, team: 'Wik 2', year: 2009, gender: 'w', roles: 'ZA'});        
        this.createMember('').loadFrom({name: 'Hedwig', number: 11, team: 'Wik 1', year: 2009, gender: 'w', roles: 'AZ'});        
        this.createMember('').loadFrom({name: 'Milla', number: 13, team: 'Wik 1', year: 2008, gender: 'w', roles: 'AMZ'});        
        this.createMember('').loadFrom({name: 'Alice', number: 6, team: 'Wik 2', year: 2010, gender: 'w', roles: 'M'});        
        this.createMember('').loadFrom({name: 'Lissy', number: 25, team: 'Wik 1', year: 2009, gender: 'w', roles: 'AZ'});        
        this.createMember('').loadFrom({name: 'Leila', number: 2, team: 'Wik 2', year: 2008, gender: 'w', roles: 'A'});
    }

}

class Member extends Model {

    constructor(club, name = null) {
        super(name);
        this._club = club;
        this._number = null;
        this._team = null;
        this._year = null;
        this._gender = null;
        this._roles = null; // AMZLD
    }

    get club() {
        return this._club;
    }

    get number() {
        return this._number;
    }

    set number(value) {
        if (value!=this._number) {
            this._number = value;
            this.changed('number');
        }
    }

    get numberString() {
        return this._number === null ? '' : this._number.toString();
    }

    get team() {
        return this._team;
    }

    set team(value) {
        if (value != this._team) {
            let oldTeam = this._team;
            this._team = value;
            if (oldTeam !== null)
                oldTeam.removeMember(this);
            if (this._team !== null)
                this._team.addMember(this);
            this.changed('team');
        }     
    }
    
    get year() {
        return this._year;
    }

    set year(value) {
        if (value!=this._year) {
            this._year = value;
            this.changed('year');
        }
    }

    get gender() {
        return this._gender;
    }

    set gender(value) {
        if (value!=this._gender) {
            this._gender = value;
            this.changed('gender');
        }
    }

    get roles() {
        return this._roles;
    }

    set roles(value) {
        if (value!=this._roles) {
            this._roles = value;
            this.changed('roles');
        }
    }

    storeTo(container) {
        super.storeTo(container);
        container.number = this._number;
        container.team = this._team === null ? null : this._team.name;
        container.year = this._year;
        container.gender = this._gender;
        container.roles = this._roles; 
    }

    loadFrom(container) {
        super.loadFrom(container);
        this.number = this.readProp(container, 'number', null);
        let teamName = this.readProp(container, 'team', null);
        this.team = this.club.teams.find((team)=>team.name == teamName);
        this.year = this.readProp(container, 'year', null);
        this.gender = this.readProp(container, 'gender', null);
        this.roles = this.readProp(container, 'roles', null);
    }

}

class Team extends Model {

    constructor(name) {
        super(name);
        this.members = new ModelArray(this, 'members');
    }

    addMember(member) {
        return this.members.add(member).team = this;
    }

    removeMember(member) {
        this.members.remove(member);
    }
    
}

class Player extends Model {
        
    constructor(match, member) {
        super(member.name);
        this._match = match;
        this._member = member;
        this._startingPos = null;
        this._place = 'bench'; // court, bench
        this._state = null; // starter, substitute
        this.register(e => this.onStartingPosChange(e));
    }

    get match() {
        return this._match;
    }

    get startingPos() {
        return this._startingPos; // 0..5
    }

    set startingPos(value) {
        if (!this.match.running && value !== null && value !== this._startingPos) {
            var player = this.match._startingSix[value];
            if (this.place=='bench') {
                if (player === null) {
                    // From bench to empty place
                    this.match._startingSix[value] = this;
                    this._startingPos = value;
                    this.place = 'court';
                    this.changed('startingpos');    
                    this.match.changed('startingsix'); 
                } else {
                    // From bench to occupied place
                    this.match._startingSix[value] = this;
                    player._startingPos = null;
                    player._place = 'bench';
                    this._startingPos = value;
                    this._place = 'court';
                    player.changed('startingpos');
                    player.changed('place');
                    this.changed('startingpos');
                    this.changed('place');
                }
            } else {
                if (player === null) {
                    // From court to empty place
                    this.match._startingSix[this._startingPos] = null;
                    this.match._startingSix[value] = this;
                    this._startingPos = value;
                    this.changed('startingpos');
                } else {
                    // From court to occupied place
                    this.match._startingSix[value] = this;
                    this.match._startingSix[this._startingPos] = player;
                    player._startingPos = this._startingPos;
                    this._startingPos = value;
                    player.changed('startingpos');
                    this.changed('startingpos');
                }
            }
            this.match.changed('startingsix'); 
        }
    }

    get position() {
        return (this.startingPos - (this.match.rotation % 6) + 6) % 6;
    }

     get member() {
        return this._member;
    }

    get place() {
        return this._place;
    }

    set place(value) {
        if (value!=this._place) {
            if (!['court', 'bench'].includes(value)) return;
            this._place = value;      
            this.changed('place');
            if (!this.match.running && this._place=='bench')
                this.startingPos = null;
        }
    }

    get state() {
        return this._state;
    }   

    set state(value) {
        if (value!=this._state) {
            if (!['starter', 'substitute'].includes(value)) return;
            this._state = value;
            this.changed('state');
        }
    }   

    onStartingPosChange(event) {
        this.match.log = `position change: ${event.model.name} to ${event.model.startingPos+1}`;
    }
 
}

class Match extends Model {

    constructor(name, team) {
        super(name);
        this._team = team;
        this._players = new ModelArray(this, 'players');
        this._running = false;
        this._rotation = 0;
        this._startingSix = Array(6).fill(null);
        this._clockTimer = null;
        this._time = null;
        this._watchStart = null;
        for (let member of team.members)
            this._players.add(new Player(this, member));   
    }

    get team() {
        return this._team;
    }

    get players() {
        return this._players;
    }

    get running() {
        return this._running;
    }

    set running(value) {
        if (value != this._running) {
            if (value && this.countStartingSix() != 6) return;
            this._running = value;
            if (this._running)
                this._watchStart = new Date();
            if (this._rotation != 0) {
                this._rotation = 0;
                this.changed('rotation');
            }
            this.changed('running');
        }
    }

    get clockEnable() {
        return this._clockTimer !== null;
    }

    set clockEnable(value) {
        if (this.clockEnable == value) return;
        if (value)
            this._clockTimer = setInterval(()=>{
                this._clock = new Date();
                this.changed('clock');
            }, 1000);
        else {
            clearInterval(this._clockTimer);
            this._clockTimer = null;
        }
    }

    get clockString() {
        if (this._clock === null) return '--:--:--';
        const hours = String(this._clock.getHours()).padStart(2, '0');
        const minutes = String(this._clock.getMinutes()).padStart(2, '0');
        const seconds = String(this._clock.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    get watchString() {
        if (this._watchStart === null || this._clock === null) return '--:--';
        var s = (this._clock.getTime() - this._watchStart.getTime()) / 1000;
        const minutes = String(Math.floor(s / 60)).padStart(2, '0');
        const seconds = String(Math.floor(s % 60)).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    get rotation() {
        return this._rotation;
    }

    countStartingSix() {
        let count = 0;
        for (let player of this._startingSix)
            if (player !== null)
                count++;
        return count;
    }

    rotateForward() {
        if (this.running) {
            this._rotation += 1;
            this.changed('rotation');
        } else {
            var player0 = this._startingSix[0];
            for (let i=0; i<5; i++) {
                this._startingSix[i] = this._startingSix[i+1];
                this._startingSix[i]._startingPos = i;
            }
            this._startingSix[5] = player0;
            this._startingSix[5]._startingPos = 5;
            this.changed('rotation');
            for (let player of this._players)
                player.changed('startingpos');
        }
    }

    rotateBackward() {
        if (this.running) {
            if (this._rotation==0) return;
            this._rotation -= 1;
            this.changed('rotation');
        } else {
            var player5 = this._startingSix[5];
            for (let i=5; i>0; --i) {
                this._startingSix[i] = this._startingSix[i-1];
                this._startingSix[i]._startingPos = i;
            }
            this._startingSix[0] = player5;
            this._startingSix[0]._startingPos = 0;
            this.changed('rotation');
            for (let player of this._players)
                player.changed('startingpos');
        }
    }

}    

