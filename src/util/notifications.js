// export class OGIMessage {
//     id = '';
//     title = '';
//     type = 'basic';
//     message = '';
//     eventTime = 0;

//     constructor(id, title, message, eventTime = 0, type = null){
//         this.id = id;
//         this.title = title;
//         this.message = message;
//         this.type = type || 'basic';
//         this.eventTime = eventTime;
//     }
// }

// export class OGINotifications {
//     data = {};

//     add(msg = OGIMessage){
//         this.data[msg.id] = msg;
//     }

//     remove(id){
//         delete this.data[id];
//     }

//     exists(id){
//         return typeof this.data[id] == 'object';
//     }

//     clearAll(){
//         this.data = {};
//     }

//     get(id){
//         return this.data[id];
//     }

//     show(msg = OGIMessage){
//         this.remove(msg.id);
//         delete msg.id;

//         document.dispatchEvent(new CustomEvent('ogi-notification', {detail: msg}));
//     }

//     getCurrent(){
//         let ret = [];
//         Object.keys(this.data)
//         .filter(key => {
//             if(this.data[key].eventTime <= Date.now()){
//                 ret.push(this.data[key]);
//             }
//         })

//         return ret;
//     }
// }
