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
      UPDATE runs SET status='interrupted' WHERE status IN ('running','queued','waiting_approval');`);
    this.db.exec('CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY, conversation TEXT, message TEXT)');
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
  request(id:string,conversation:string,message:string) {
    this.db.prepare('INSERT INTO requests VALUES(?,?,?)').run(id,conversation,message);
  }
  conversations() {
    return this.db.prepare(`SELECT m.conversation AS id, m.content AS title FROM messages m
      WHERE m.id IN (SELECT min(id) FROM messages WHERE role='user' GROUP BY conversation)
      ORDER BY m.id DESC`).all();
  }
  search(query:string) {
    return this.db.prepare(`SELECT conversation AS conversationId,role,content,id
      FROM messages WHERE instr(lower(content),lower(?))>0 ORDER BY id DESC LIMIT 40`).all(query);
  }
  interrupted() {
    return this.db.prepare(`SELECT r.id,r.conversation AS conversationId,q.message FROM runs r
      JOIN requests q ON q.id=r.id WHERE r.status='interrupted' ORDER BY r.rowid`).all();
  }
  runEvents(id:string):Event[] {
    return this.db.prepare('SELECT id,run AS runId,type,payload,time FROM events WHERE run=? ORDER BY id')
      .all(id).map(row=>({...row,payload:JSON.parse(String(row.payload))})) as Event[];
  }
}
