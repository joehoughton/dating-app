import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, pipe } from 'rxjs';
import { User } from '../_models/user';
import { PaginatedResult } from '../_models/pagination';
import { map, take } from 'rxjs/operators';
import { Message } from '../_models/Message';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  baseUrl = environment.apiUrl;
  hubUrl = environment.hubUrl;
  private hubConnection: HubConnection;
  private messageThreadSource = new BehaviorSubject<Message[]>([]);
  messageThread$ = this.messageThreadSource.asObservable(); // $ signifies that it's an observable

  constructor(private http: HttpClient) { }

  createHubConnection(token: string, recipientId: number)
  {
    this.hubConnection = new HubConnectionBuilder()
    .withUrl(this.hubUrl + 'message?recipientId=' + recipientId.toString(), {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
    .build();

    this.hubConnection.start().catch(error => console.log(error));

    this.hubConnection.on('ReceiveMessageThread', messages => {
      this.messageThreadSource.next(messages);
    });

    this.hubConnection.on('NewMessage', message => {
      this.messageThread$.pipe(take(1)).subscribe(messages => {
        let newMessages = [...messages]; // avoid mutating state
        newMessages.unshift(message); // insert to start of array
        this.messageThreadSource.next(newMessages);
      })
    });
  }

  getUsers(page?, itemsPerPage?, userParams?, likesParam?): Observable<PaginatedResult<User[]>> {
    const paginatedResult: PaginatedResult<User[]> = new PaginatedResult<User[]>();

    let params = new HttpParams();

    if (page != null && itemsPerPage != null) {
      params = params.append('pageNumber', page);
      params = params.append('pageSize', itemsPerPage);
    }

    if (userParams != null) {
      params = params.append('minAge', userParams.minAge);
      params = params.append('maxAge', userParams.maxAge);
      params = params.append('gender', userParams.gender);
      params = params.append('orderBy', userParams.orderBy);
    }

    if (likesParam === 'Likers') {
      params = params.append('likers', 'true');
    }

    if (likesParam === 'Likees') {
      params = params.append('likees', 'true');
    }

    return this.http.get<User[]>(this.baseUrl + 'users', { observe: 'response', params})
    .pipe(
      map(response => {
        paginatedResult.result = response.body;
        if (response.headers.get('Pagination') != null) {
          paginatedResult.pagination = JSON.parse(response.headers.get('Pagination'));
        }
        return paginatedResult;
    })
    );
  }

  getUser(id): Observable<User> {
    return this.http.get<User>(this.baseUrl + 'users/' + id);
  }

  updateUser(id: number, user: User) {
    return this.http.put(this.baseUrl + 'users/' + id, user);
  }

  setMainPhoto(userId: number, id: number) {
    return this.http.post(this.baseUrl + 'users/' + userId + '/photos/' + id + '/setMain', {});
  }

  deletePhoto(userId: number, id: number) {
    return this.http.delete(this.baseUrl + 'users/' + userId + '/photos/' + id);
  }

  sendLike(id: number, recipientId: number) {
    return this.http.post(this.baseUrl + 'users/' + id + '/like/' + recipientId, {});
  }

  getMessages(id: number, page?, itemsPerPage?, messageContainer?) {
    const paginatedResult: PaginatedResult<Message[]> = new PaginatedResult<Message[]>();

    let params = new HttpParams();

    params = params.append('MessageContainer', messageContainer);

    if (page != null && itemsPerPage != null) {
        params = params.append('pageNumber', page);
        params = params.append('pageSize', itemsPerPage);
      }

    return this.http.get<Message[]>(this.baseUrl + 'users/' + id + "/messages", {observe: 'response', params })
      .pipe(
        map (response => {
          paginatedResult.result = response.body;
          if (response.headers.get('Pagination') !== null) {
            paginatedResult.pagination = JSON.parse(response.headers.get('Pagination'));
          }

          return paginatedResult;
        })
      );
  }

  getMessageThread(id: number, recipientId: number) {
    return this.http.get<Message[]>(this.baseUrl + 'users/' + id + '/messages/thread/' + recipientId);
  }

  // [Obsolete: "Replaced for SignalR MessageHub"]
  /* sendMessage(id: number, message: Message) {
    return this.http.post(this.baseUrl + 'users/' + id + '/messages', message);
  } */

  async sendMessage(message: Message) {
    return this.hubConnection.invoke('SendMessage', message)
      .catch(error => console.log(error));
  }

  deleteMessage(id: number, userId: number) {
    return this.http.post(this.baseUrl + 'users/' + userId + '/messages/' + id, {});
 }

  markAsRead(userId: number, messageId: number) {
    this.http.post(this.baseUrl + 'users/' + userId + '/messages/' + messageId + '/read', {}).subscribe();
  }

  stopHubConnection() {
    if (this.hubConnection)
      this.hubConnection.stop();
  }
}
