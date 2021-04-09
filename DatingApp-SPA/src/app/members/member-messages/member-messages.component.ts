import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Message } from 'src/app/_models/message';
import { UserService } from 'src/app/_services/user.service';
import { AlertifyService } from 'src/app/_services/alertify.service';
import { AuthService } from 'src/app/_services/auth.service';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-member-messages',
  templateUrl: './member-messages.component.html',
  styleUrls: ['./member-messages.component.css']
})
export class MemberMessagesComponent implements OnInit, OnDestroy {
  @Input() recipientId: number;
  messages: Message[];
  newMessage: any = {};

  constructor(public userService: UserService, private authService: AuthService, private alertify: AlertifyService) {}

  ngOnInit() {
    // this.loadMessages(); // replaced for SignalR MessageHub
    this.userService.createHubConnection(this.authService.getToken(), this.recipientId);
  }

  ngOnDestroy(): void {
    this.userService.stopHubConnection();
  }

  // [Obsolete: "Replaced for SignalR MessageHub"]
  /* loadMessages() {
    const currentUserId = +this.authService.decodedToken.nameid;
    this.userService.getMessageThread(this.authService.decodedToken.nameid, this.recipientId)
      .pipe(
        tap(messages => {
          for (let i = 0; i < messages.length; i++) {
            if (messages[i].isRead === false && messages[i].recipientId === currentUserId){
              this.userService.markAsRead(currentUserId, messages[i].id);
            }
          }
        })
      )
      .subscribe(messages => {
        this.messages = messages;
      }, error => {
        this.alertify.error(error);
      });
  } */

  // [Obsolete: "Replaced for SignalR MessageHub"]
  /* sendMessage() {
    this.newMessage.recipientId = this.recipientId;
    this.userService.sendMessage(this.authService.decodedToken.nameid, this.newMessage)
    .subscribe((message: Message) => {
      this.messages.unshift(message);
      this.newMessage.content = '';
    }, error => {
      this.alertify.error(error);
    });
  } */

  sendMessage() {
    this.newMessage.recipientId = this.recipientId;
    this.userService.sendMessage(this.newMessage)
    .then((message: Message) => {
      this.newMessage.content = '';
    }, error => {
      this.alertify.error(error);
    });
  }

  deleteMessage(id: number) {
    this.alertify.confirm('Are you sure want to delete this message?', () => {
      this.userService.deleteMessage(id, this.authService.decodedToken.nameid).subscribe(() => {
        this.messages.splice(this.messages.findIndex( m => m.id === id), 1);
        this.alertify.success('Messages has been deleted');
      }, error => {
        this.alertify.error('Failed to delete the message');
      });
    });
  }
}
