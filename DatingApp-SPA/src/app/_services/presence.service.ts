import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AlertifyService } from './alertify.service';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  hubUrl = environment.hubUrl;
  private hubConnection: HubConnection;
  private onlineUsersSource = new BehaviorSubject<string[]>([]);
  onlineUsers$ = this.onlineUsersSource.asObservable();

  constructor(private alertify: AlertifyService) { }

  createHubConnection(token: string) { // web sockets have no support for authentication header
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl + 'presence', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

      this.hubConnection
        .start()
        .catch(error => {
          console.log(error);
        });

      this.hubConnection.on('UserIsOnline', username => {
        this.alertify.message(username + ' has connected');
      });

      this.hubConnection.on('UserIsOffline', username => {
        this.alertify.message(username + ' has disconnected');
      });

      this.hubConnection.on('GetOnlineUsers', (usernames: string[]) => {
        this.onlineUsersSource.next(usernames);
      });
  }

  stopHubConnection() {
    this.hubConnection.stop().catch(error => { console.log(error); })
  }
}