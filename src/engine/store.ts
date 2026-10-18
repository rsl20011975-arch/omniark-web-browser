import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type {Message,Event} from '../contracts/index.ts';
export class Store {
  db:DatabaseSync;
  constructor(directory:string) {
    fs.mkdirSync(directory,{recursive:true});
    this.db=new DatabaseSync(path.join(directory,'workbench.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, conversation TEXT, role TEXT, content TEXT);
      CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,run TEXT,type TEXT,payload TEXT,time TEXT);
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,conversation TEXT,status TEXT);
      UPDATE runs SET status='interrupted' WHERE status='running';`);
  }
  message(conversation:string,role:Message['role'],content:string) {
    this.db.prepare('INSERT INTO messages(conversation,role,content) VALUES(?,?,?)').run(conversation,role,content);
  }
  history(conversation:string):Message[] {
    return this.db.prepare('SELECT role,content FROM messages WHERE conversation=? ORDER BY id').all(conversation) as Message[];
  }
  event(runId:string,type:string,payload:unknown) {
    this.db.prepare('INSERT INTO events(run,type,payload,time) VALUES(?,?,?,?)')
      .run(runId,type,JSON.stringify(payload),new Date().toISOString());
  }
  events():Event[] {
    return this.db.prepare('SELECT id,run AS runId,type,payload,time FROM events ORDER BY id DESC LIMIT 150')
      .all().reverse().map(row=>({...row,payload:JSON.parse(String(row.payload))})) as Event[];
  }
  run(id:string,conversation:string) {
    this.db.prepare('INSERT INTO runs VALUES(?,?,?)').run(id,conversation,'running');
  }
  status(id:string,status:string) {this.db.prepare('UPDATE runs SET status=? WHERE id=?').run(status,id);}
}
