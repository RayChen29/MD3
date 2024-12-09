//Handle card methods here pref.
//...how to transmit context data like rooms and other data from app.ts to here
interface Card {
    name:string;
    type:string; //Action, Property, Money, Reactive
    colors?:string[];//what colors are this card applicable to?
    //tbh not how to to smoothly implement colors or houses/hotels
    currentColor?:number;//should probably be empty at first, but number prob determine what color it is at the moment?
    value:number;
    quantity:number;
}

interface Set {
    //todo?: Unsure if this is safe as an initial empty array, or when it becomes empty due to being stolen and the like.
    cards:Card[];//arrays of arrays of cards. Rough idea: Card[colors][Card in that color]
    isFullSet:boolean;//default to false, somehow.
    //todo: adjust setCheck logic
      //maybe want to add color here? Can try that for now
    color:string;
}

interface Player {
    userId: string;
    userName: string;
    rope: number;//How to modify this number over time?
    //Unsure if this can pull through
    isReady:boolean;
    //in game
    connected?:boolean;
    actions?:number;
    sets?:number;
    turnPlayer?:boolean;
  }

interface Room {
    [key: string]: {
      inGame: boolean;
      players: Player[];//keep track of players in the room
      password?: string;
      host: string;//host's userId
      countdown:number; //when hits 0, game starts
      timeTicking:boolean; //is time ticking or not?
  
      //todo: max length allowed. 5 for now, but need to account later
      maxPlayers: number;
  
      //in-game stuff
      deck:Card[];//
      discard:Card[];
      fields:Record<string,Field>//Each player's boards?; need to dynamic adjust for number of players.
    };
  }

const setBreakpoints = [ //color:how many properties of that color that it takes to become a full set.
    {blue:2},
    {green:3},
    {sky:3},
    {brown:2},
    {magenta:3},
    {orange:3},
    {yellow:3},
    {red:3},
    {black:4},
    {util:2}
];
  



// const
//TODO: Allow shuffleability of cards. Might not be allowed to be a const down the line.
//each card is defined here.
//todo? implement methods to each card where applicable?
//todo? turn this into a dict and use the name for the key. Is this already a dict?
export const createDeck = (decks:number): Card[] => { //declare amount of decks to smush together; determined by no of players.
    let deck = [];
    for(let i = decks; i >  0; i -=1)
    {
        for(const card of CardDatabase)
            {
                for(let i = 0; i < card.quantity; i++)
                    deck.push(card)
            }
    }
    return deck;//todo? make return type a Card[]?
}

export const shuffleDeck = (deck: Card[] = [], discard: Card[] = []): Card[] => { 
    // pile will always be an array, initialized as empty by default
    let pile: Card[] = [...deck, ...discard];  // combine deck and discard into pile

    // shuffle logic
    let newDeck: Card[] = [];
    const pileSize = pile.length;

    for (let i = 0; i < pileSize; i++) {
        const rng = Math.floor(pile.length * Math.random());
        if(rng < pile.length)
            newDeck.push(pile[rng]!);
        pile.splice(rng, 1);  // remove the card from pile to prevent duplicates
    }

    return newDeck;
};


export const CardDatabase: Card[] = [
//Action cards here
    {name:'dealBreaker',type:'action',value:5,quantity:2},
    {name:'debtCollector',type:'action',value:3,quantity:3},
    {name:'forcedDeal',type:'action',value:3,quantity:4},
    {name:'doubleRent',type:'action',value:1,quantity:2},
    {name:'hotel',type:'action',value:4,quantity:3},
    {name:'house',type:'action',value:3,quantity:3},
    {name:"birthday",type:'action',value:2,quantity:3},
    {name:'sayNo',type:'action',value:4,quantity:3},
    {name:'passGo',type:'action',value:1,quantity:10},
    {name:'slyDeal',type:'action',value:3,quantity:3},

    //Single Color Properties
    //TODO: handle rent breakpoints eventually
    {name:'baltic',type:'property',colors:['brown'],value:1,quantity:1},
    {name:'mediterranean',type:'property',colors:['brown'],value:1,quantity:1},
    {name:'boardwalk',type:'property',colors:['blue'],value:4,quantity:1},
    {name:'parkPlace',type:'property',colors:['blue'],value:4,quantity:1},
    {name:'nCarolina',type:'property',colors:['green'],value:4,quantity:1},
    {name:'pacific',type:'property',colors:['green'],value:4,quantity:1},
    {name:'scranton',type:'property',colors:['green'],value:4,quantity:1},
    {name:'connecticut',type:'property',colors:['sky'],value:1,quantity:1},
    {name:'oriental',type:'property',colors:['sky'],value:1,quantity:1},
    {name:'vermont',type:'property',colors:['sky'],value:1,quantity:1},
    {name:'newYork',type:'property',colors:['orange'],value:2,quantity:1},
    {name:'stJames',type:'property',colors:['orange'],value:2,quantity:1},
    {name:'tennessee',type:'property',colors:['orange'],value:2,quantity:1},
    {name:'stCharles',type:'property',colors:['magenta'],value:2,quantity:1},
    {name:'virginia',type:'property',colors:['magenta'],value:2,quantity:1},
    {name:'states',type:'property',colors:['magenta'],value:2,quantity:1},
    {name:'short',type:'property',colors:['black'],value:2,quantity:1},
    {name:'BnO',type:'property',colors:['black'],value:2,quantity:1},
    {name:'reading',type:'property',colors:['black'],value:2,quantity:1},
    {name:'scrantonRR',type:'property',colors:['black'],value:2,quantity:1},
    {name:'kentucky',type:'property',colors:['red'],value:3,quantity:1},
    {name:'indiana',type:'property',colors:['red'],value:3,quantity:1},
    {name:'illinois',type:'property',colors:['red'],value:3,quantity:1},
    {name:'water',type:'property',colors:['util'],value:2,quantity:1},
    {name:'electric',type:'property',colors:['util'],value:2,quantity:1},
    {name:'ventnor',type:'property',colors:['yellow'],value:3,quantity:1},
    {name:'marvin',type:'property',colors:['yellow'],value:3,quantity:1},
    {name:'atlantic',type:'property',colors:['yellow'],value:3,quantity:1},

    //Wildcard Properties
    {name:'wildGreenBlue',type:'property',colors:['blue','green'],value:4,quantity:1},
    {name:'wildGreenBlack',type:'property',colors:['green','black'],value:2,quantity:1},
    {name:'wildBlackUtil',type:'property',colors:['util','black'],value:2,quantity:1},
    {name:'wildSkyBlack',type:'property',colors:['sky','black'],value:4,quantity:1},
    {name:'wildBrownSky',type:'property',colors:['sky','brown'],value:1,quantity:1},
    {name:'wildProp',type:'property',colors:['blue','green','sky','brown','magenta','orange','yellow','red','black','util'],value:0,quantity:2},
    {name:'wildMagentaOrange',type:'property',colors:['magenta','orange'],value:2,quantity:2},
    {name:'wildRedYellow',type:'property',colors:['yellow','red'],value:3,quantity:2},

    //Rent
    {name:'rentWild',type:'rent',colors:['blue','green','sky','brown','magenta','orange','yellow','red','black','util'],value:3,quantity:3},
    {name:'rentGreenBlue',type:'rent',colors:['blue','green'],value:1,quantity:2},
    {name:'rentBrownSky',type:'rent',colors:['sky','brown'],value:1,quantity:2},
    {name:'rentMagentaOrange',type:'rent',colors:['magenta','orange'],value:1,quantity:2},
    {name:'rentBlackUtil',type:'rent',colors:['util','black'],value:1,quantity:2},
    {name:'rentRedYellow',type:'rent',colors:['yellow','red'],value:1,quantity:2},

    //Money
    {name:'money10',type:'money',value:10,quantity:1},
    {name:'money5',type:'money',value:5,quantity:2},
    {name:'money4',type:'money',value:4,quantity:3},
    {name:'money3',type:'money',value:3,quantity:3},
    {name:'money2',type:'money',value:2,quantity:5},
    {name:'money1',type:'money',value:1,quantity:6},
]

interface Field {
    hand:Card[];
    money:Card[];
    //need a smoother way to handle properties.
    // props:Card[];
    props:Set;
  }
//todo later: handle the 'cards in money pool' cases
//what parameters/arguments do I want to use?
//How to validate and stuff

//audits prob just concern cards for the turn player's turn, rather than outside their turn.
//todo? Handle the Say No cases.
//todo? implement function to quickly check fields
//todo: exclude util and railroad from house/hotel set.



// export const auditCard = (roomId:string,playerId:string,card:Card) => {
//     // const excludeKey = playerId;//Don't let the card player count themselves eligible for card eligibility.
//     let acts = [];//todo? Prob need to fix this somehow.
//     const room = rooms[roomId];
//     const thePlayer = room.players[room.players.findIndex(p=>p.userId === playerId)];
//     if(thePlayer.actions >= 0)
//     {
//         if(card.type != 'property')
//             acts.push('money');
//         else
//             acts.push('property');//todo: Need to implement highlighting sets/like colors for playing props.
//         //actions
//         switch(card.name)
//         {
//             case('dealbreaker')://good for now?
//                 //check each field's props for sets
//                 let playersWithSets = [];
//                 for(const otherPlayerId in room.fields)
//                 {
//                     if(otherPlayerId == playerId)//don't check the card player's field
//                         continue;//I hope...
//                     const otherPlayerSets = checkPlayerSets(roomId, otherPlayerId);
//                     if(otherPlayerSets.length > 0)
//                     {
//                         if(!acts.includes('action'))
//                             acts.push('action');
//                         playersWithSets.push(otherPlayerId);//I hope...
//                         continue;//I hope...
//                     }
//                 }
//             case('debtCollector'):
//                 for(const key in room.fields)//for each other user
//                 {
//                     if(key === playerId)//exclude the one who used the card
//                         continue;
//                     let netWorth:number = 0;
//                     //check props then money
//                     //unsure if affected by Card->Set change.
//                     if(room.fields[key].props.length > 0)// if at least 1 set/card in props
//                         for(const collection of room.fields[key].props)//collector = catch-all term for color of cards/whether in a set or not
//                             for(const card of collection)//for each card in that collection/color
//                             netWorth += card.value;
//                     if(room.fields[key].money.length > 0)
//                         for(const card of room.fields[key].money)
//                             netWorth += card.value;
//                     if(netWorth > 0)
//                     {
//                         //todo: push valid targets to acts.
//                         if(!acts.includes('action'))
//                             acts.push('action');
//                         acts.push(key);//intention: push the userId to the list as a valid target for playing the card.
//                     }
//                 }
//                 break;
//             case('forcedDeal'):
//             //check turn player's board for any property in play.
                
//                 if(room.fields[playerId].props.length == 0)//if  player has no props are in play, stop audit. IDK if affected by card->set change
//                     break;
//                 // const turnPlayerProps = 
//                 // if(checkPlayerSets(roomId,playerId) == [])
//                     // break;
//                 //if only sets are in play, also disable
//                 // if(room.fields[])
//                 // const turnPlayerProps = room.fields[playerId].props.filter(c=>c.isFullSet == true);
//                 // if(turnPlayerProps == room.fields[playerId].props)//unsure if triple and double would work similarly
//                     // break;
//                 //check other players for any property in play.
//                 for(const otherPlayerId in room.fields)
//                 {
//                     // if(excludeKey.includes(key))
//                     if(otherPlayerId == playerId)
//                         continue;
//                     //check other players for non-set properties
//                     if(room.fields[otherPlayerId].props == checkPlayerSets(roomId,otherPlayerId))
//                         continue;
//                     // const otherPlayerProps = room.fields[otherPlayerId].props.filter(c=>c.isFullSet == true)
//                     // if(otherPlayerProps == room.fields[otherPlayerId].props)
//                         // continue;// I hope this skips.
//                     // if(room.fields[key].props.length > 0)//TODO: implement set immunity logic.
//                     // {
//                     if(!acts.includes('action'))
//                         acts.push('action');
//                     acts.push(otherPlayerId);
//                 }      
//                 break;
//             //skip double rent because meant to be in tandem?
//             case('house')://Turn player needs to own at least one set.
//             //todo: check if there is a house card within the set(s), cancel audit if all sets have houses.
//                 const ownedSets = checkPlayerSets(roomId,playerId);
//                 if(ownedSets.length > 0)
//                 {
//                     for(const set of ownedSets)//scan through sets
//                     {
//                         let isEligibleSet:boolean = true;
//                         for(const card of set)//scan through cards in each given set
//                         {
//                             if(card.name == 'house')//skip the set if a house card is in there.
//                                 isEligibleSet = false;
//                         }
//                         if(isEligibleSet)
//                         {
//                             acts.push('action')
//                             break;
//                         }
//                     }
//                 }
//                 break;
//                 //comeback later.
//             case('hotel'):
//                 const ownedSets = checkPlayerSets(roomId,playerId);
//                 if(ownedSets.length > 0)//TBH didn't change much compared to the house version.
//                 {
//                     for(const set of ownedSets)//scan through sets
//                     {
//                         let hasHouse:boolean = false;
//                         let hasHotel:boolean = false;
//                         for(const card of set)//scan through cards in each given set
//                         {
//                             if(card.name == 'house')
//                                 hasHouse = true;
//                             if(card.name == 'hotel')
//                                 hasHotel = true;
//                         }
//                         if(hasHouse && !hasHotel)
//                         {
//                             acts.push('action')
//                             break;
//                         }
//                     }                    
//                 }
//                 if(checkPlayerSets(roomId,playerId).length > 0)
//                     acts.push('action');
//                 break;

//             case('birthday'):
//                 for(const otherPlayerId in room.fields)
//                 {
//                     if(otherPlayerId === playerId)
//                         continue;
//                     let netWorth:number = 0;
//                     //check props then money
//                     if(room.fields[otherPlayerId].props.length > 0)
//                         for(const playedCard of room.fields[otherPlayerId].props)
//                             netWorth += playedCard.value;
//                     if(room.fields[otherPlayerId].money.length > 0)
//                         for(const playedCard of room.fields[otherPlayerId].money)
//                             netWorth += playedCard.value;
//                     if(netWorth > 0)
//                     {
//                         acts.push('action');
//                         break;
//                     }
//                 }
//                 break;
//             case('passGo')://I would do the below, but let them learn Kappa
//                 acts.push('action');
//                 break;
//             case('slyDeal'):
//                 //check other players for any property/if they are sets in play.
//                 for(const otherPlayerId in room.fields)
//                 {
//                     if(otherPlayerId === playerId)//todo? Just make a filtered list and go through that? Or is that wasteful?
//                         continue;
//                     const otherPlayerProps = room.fields[otherPlayerId].props;
//                     if(otherPlayerProps == checkPlayerSets(roomId,playerId) || otherPlayerProps.length == 0)//intent: if only sets exist in the player's prop field OR if player doesn't own props, skip
//                         continue;
//                     // if(room.fields[otherPlayerId].props.length > 0)
//                     // {
//                         //TODO: check for sets.
//                     acts.push('action');
//                     break;
//                     // }
//                 }      
//                 break;                
//             default:
//                 break;
//         }
//         //rents
//         if(card.type === 'rent')
//         {
//             switch(card.name)
//             {
//                 case('rentWild'):
//                     if(room.fields[playerId].props.length > 0)
//                         acts.push('action');
//                     break;
//                 default:
//                     let colors:string[] = [];
//                     //check for if player has any properties of the right colors.
//                     if(room.fields[playerId].props.length > 0)
//                     {
//                         for(const prop of room.fields[playerId].props)
//                         {
//                             for(const color in colors)//TODO: Handle the wildcard cases.
//                                 if(!colors.includes(prop.color))
//                                     colors.push(color)
//                         }
//                     }
//                     //todo: check if the turnPlayer has either color specified by the card.
//                     for(let color in card.colors)
//                         if(colors.includes(color))//if any of player's props is a color on the rent card, enable action
//                             acts.push('action');
//                     break;       
//             }
//         }
//     }
//     return acts;
// }
//Intent: look up the library of cards and pull the correct one based on card name.
const cardToAdd = (cardName:string) => {//What this even do?
    return CardDatabase.filter(c=>c.name == cardName);//hope this works
}
//emit function; purpose is to get responses from other players besides card player, in case of say no's and stuff
//maybe need to export this one to?
//...need to translate this one into SocketIO
// async function responsePromiseEmit(roomCode:string,cardPlayerId:string): Promise<any[]> {//tbh idk about this one atm
//     const clientSockets = await io.in(roomCode).allSockets();//find all clients
// //notyet done
//     const responsePromises = Array.from(clientSockets).map(clientId => 
//         new Promise((resolve,reject)=>{
//             io.to(clientId).emit()
//         })
//     )
//     return [0];
//     //idk what to return
// }

//TODO: Have client show valid targets for card placements/targets via borders or something
//todo: Unsure how we want to implement other users getting interacted with.
//For the 'players' argument, can be any people; Players might not exist either.
// export const useCard = (roomId:string, playerId:string, card:Card,players?:string[]) => {
//     const room = rooms[roomId];
//     if(!room)
//         return 0;//Idk actual return type atm.
//     switch (card.type) {
//         //TODO: Let client show valid card placements to user prior to committing the action.
//         //TODO: Can prob make a sets interface that can contain cards, as well as just having setCount count out length.
//         //TODO: Somehow let props field contain sets as well. Not sure how that can pan out., 
//         case 'property'://TODO later: give client options for how and where to play the property card
//             const hand = room.fields[playerId].hand;
//             if(!hand)
//                 return 0;
//             hand.filter(c=>c.name != card.name);//essentially remove card from hand.
//             //add that card on their field.
//             const propField = room.fields[playerId].props;
//             propField.push(cardToAdd(card.name));//I hope this is right

//             //todo client stuff
//             //TODO: place like-colored props in a column. Prob a client thing tho.
//             //Todo: recognize sets upon placing card down
//             break;

//         //Action cards will prob get another switch case within.
//         case 'action':
//             //prompt other players for sayNo, even if nobody has it.
//             let responseCheck = 0;
//             //for each player, emit a response event, providing a random time to respond if they cannot.

//             //Todo: only give this delay to people with at least one card in hand.
//             //todo: probably just handle this in ingame.ts
//             let randomDelay = Math.floor(Math.random()*5);//For people without a response/say no, set a random delay of 3-5 seconds to 'pretend'
//             if(randomDelay < 3)
//                 randomDelay = 3;

//             // const async actionResponse = await socket.to(roomCode).emitWithAck('actionCardRespond',(lastPlayerId));//How to exclude the last card's player from getting this?
//             //how to send an async event to multiple people?


//             //probably wait for 10 seconds or until all parties respond, whichever happens first.
//             //activate function on target. Unless someone negates.  

//             if(players)//check if players array exists.
//             {
//                 switch(card.name)
//                 {
//                     case 'dealBreaker':
//                 }

//                 //I guess handle card effect cases here?
//                 /*
// //Action cards here
//                 {name:'dealBreaker',type:'action',value:5,quantity:2},
//                 {name:'debtCollector',type:'action',value:3,quantity:3},
//                 {name:'forcedDeal',type:'action',value:3,quantity:4},
//                 {name:'doubleRent',type:'action',value:1,quantity:2},
//                 {name:'hotel',type:'action',value:4,quantity:3},
//                 {name:'house',type:'action',value:3,quantity:3},
//                 {name:"birthday",type:'action',value:2,quantity:3},
//                 {name:'sayNo',type:'action',value:4,quantity:3},
//                 {name:'passGo',type:'action',value:1,quantity:10},
//                 {name:'slyDeal',type:'action',value:3,quantity:3},

//                 //Rent
//                 {name:'rentWild',type:'rent',colors:['blue','green','sky','brown','magenta','orange','yellow','red','black','util'],value:3,quantity:3},
//                 {name:'rentGreenBlue',type:'rent',colors:['blue','green'],value:1,quantity:2},
//                 {name:'rentBrownSky',type:'rent',colors:['sky','brown'],value:1,quantity:2},
//                 {name:'rentMagentaOrange',type:'rent',colors:['magenta','orange'],value:1,quantity:2},
//                 {name:'rentBlackUtil',type:'rent',colors:['util','black'],value:1,quantity:2},
//                 {name:'rentRedYellow',type:'rent',colors:['yellow','red'],value:1,quantity:2},
//                             */

//             }
//             break;
//     }
//     //lower player's action by 1 
// }
//todo: handle the multiple sets of same color case.
//prob use a key-value set to determine what's been done so far.

// //TODO: this part should only go through if nobody negates.
// const actionCardEffect = (cardName:string,players:string[]) => {//players = affected player(s)
//     switch(cardName)
//     {
//         case 'dealBreaker':
//             //probably scan then highlight to client available sets.
//             //steal selected set from recipient

//             //return the set, to be given to turn player from useCard

//     }
// }
//TODO: Rework this. and others prob
//TODO: FIX THIS
// export const setCheck = (roomId:string, playerId:string):number => {
//     //TODO for prop sets across the board: must be able to break off sets at the given breakpoints.
//     //might be able to handle that through the client instead.
//     return checkPlayerSets(roomId,playerId).length; 
// }