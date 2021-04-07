import { Injectable } from '@angular/core';
import * as alertify from 'alertifyjs';

@Injectable({
  providedIn: 'root'
})
export class AlertifyService {

constructor() { }

  confirm(message: string, okCallback: () => any) {
    alertify.confirm(message, (e: any) => {
      if (e) {
        okCallback();
      } else {}
    });
  }

  success(message: string) {
    return alertify.success(message);
  }

  error(message: string) {
    return alertify.error(message);
  }

  warning(message: string) {
    return alertify.warning(message);
  }

  message(message: string) {
    return alertify.message(message);
  }
}
