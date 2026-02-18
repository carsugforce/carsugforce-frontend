import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { PermissionService } from '../../../core/service/permission.service';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-render-user-columns',
  standalone: true,
  templateUrl: './render-user-columns.component.html',
  styleUrl: './render-user-columns.component.scss',
  imports: [MatIcon],
})
export class RenderUserColumnsComponent
  implements ICellRendererAngularComp {

  params: any;
  user: any;

  canEdit = false;
  canDelete = false;

  constructor(public permissionService: PermissionService) {}

  agInit(params: any): void {
    this.params = params;
    this.user = params.data;

    this.canEdit =
      this.user.role !== 'SuperAdmin' &&
      this.permissionService.has('users.edit');

    this.canDelete =
      this.user.role !== 'SuperAdmin' &&
      this.permissionService.has('users.delete');
  }

  refresh(): boolean {
    return false;
  }

  edit() {
    this.params.context.componentParent.editUser(this.user);
  }

  delete() {
    this.params.context.componentParent.deleteUser(this.user);
  }
}
