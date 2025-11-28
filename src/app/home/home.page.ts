import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';
import { ARTargetService, ARTarget } from '../services/ar-target.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  targets: ARTarget[] = [];
  currentUserId: string | null = null;
  isLoading = false;

  constructor(
    private router: Router,
    private alertCtrl: AlertController,
    private authService: AuthService,
    private supabaseService: SupabaseService,
    private arTargetService: ARTargetService
  ) {}

  async ionViewWillEnter() {
    this.isLoading = true;
    const user = this.authService.getCurrentUser();
    this.currentUserId = user ? user.uid : null;

    if (this.currentUserId) {
      try {
        this.targets = await this.arTargetService.getTargets(this.currentUserId);
      } catch {
        this.targets = [];
      } finally {
        this.isLoading = false;
      }
    } else {
      this.targets = [];
      this.isLoading = false;
      this.router.navigate(['/login']);
    }
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input?.files;
    if (!files || files.length === 0) return;

    const allowedExtensions = ['.iset', '.fset', '.fset3', '.patt', '.jpg', '.jpeg', '.png'];
    const invalidFiles = Array.from(files).filter(file => {
      const name = file.name.toLowerCase();
      return !allowedExtensions.some(ext => name.endsWith(ext));
    });

    if (invalidFiles.length > 0) {
      await this.showAlert('Error', 'Solo se permiten archivos NFT (.iset, .fset, .fset3), markers (.patt) o imágenes (.jpg/.png).');
      return;
    }

    await this.uploadAssets(files);
  }

  async uploadAssets(files: FileList | File[]) {
    if (!this.currentUserId) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    try {
      const nftFiles = Array.from(files).filter(f =>
        f.name.endsWith('.iset') || f.name.endsWith('.fset') || f.name.endsWith('.fset3')
      );
      const pattFile = Array.from(files).find(f => f.name.endsWith('.patt'));
      const imageFile = Array.from(files).find(f => f.type.startsWith('image/'));

      if (nftFiles.length === 3) {
        const baseName = nftFiles[0].name.replace(/\.(iset|fset|fset3)$/, '');
        const folder = `${this.currentUserId}/${baseName}`;

        for (const file of nftFiles) {
          const ext = file.name.split('.').pop();
          const path = `${folder}.${ext}`;
          const { error } = await this.supabaseService['supabase']
            .storage.from('ar-assets')
            .upload(path, file, { upsert: true });
          if (error) throw error;
        }

        const publicBaseUrl = `${environment.supabaseUrl}/storage/v1/object/public/ar-assets/${encodeURIComponent(folder)}`;

        const markerWidth = 616;
        const markerHeight = 900;

        const newTarget: Partial<ARTarget> = {
          name: baseName,
          type: 'nft',
          nfturlbase: publicBaseUrl,
          user_id: this.currentUserId!,
          contenturl: imageFile
            ? await this.supabaseService.uploadImage(this.currentUserId, imageFile, 'ar-assets')
            : '',
          width: markerWidth.toString(),
          height: markerHeight.toString()
        };

        await this.arTargetService.addTarget(newTarget);
        this.targets = await this.arTargetService.getTargets(this.currentUserId);
        await this.showAlert('Subida', 'NFT subido y target creado.');
      } else if (pattFile) {
        const publicUrl = await this.supabaseService.uploadFile(this.currentUserId, pattFile, 'ar-assets');
        const newTarget: Partial<ARTarget> = {
          name: pattFile.name,
          type: 'marker',
          patternurl: publicUrl,
          user_id: this.currentUserId!
        };
        await this.arTargetService.addTarget(newTarget);
        this.targets = await this.arTargetService.getTargets(this.currentUserId);
        await this.showAlert('Subida', 'Marker subido y target creado.');
      } else if (imageFile) {
        const publicUrl = await this.supabaseService.uploadImage(this.currentUserId, imageFile, 'ar-assets');
        const newTarget: Partial<ARTarget> = {
          name: imageFile.name,
          type: 'image',
          contenturl: publicUrl,
          user_id: this.currentUserId!
        };
        await this.arTargetService.addTarget(newTarget);
        this.targets = await this.arTargetService.getTargets(this.currentUserId);
        await this.showAlert('Subida', 'Imagen subida y target creado.');
      } else {
        await this.showAlert('Error', 'Debes subir los 3 archivos NFT juntos, un .patt o una imagen válida.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Revisa la consola.';
      await this.showAlert('Error', 'Falló la subida: ' + msg);
    } finally {
      this.isLoading = false;
    }
  }

  async deleteTarget(target: ARTarget) {
    if (!this.currentUserId) {
      this.router.navigate(['/login']);
      return;
    }
    const ok = await this.confirm('Eliminar', `¿Eliminar el target "${target.name}"?`);
    if (!ok) return;

    try {
      await this.supabaseService.deleteTarget(target.id);
      this.targets = await this.arTargetService.getTargets(this.currentUserId);
      await this.showAlert('Eliminar', 'Target eliminado.');
    } catch {
      await this.showAlert('Error', 'No se pudo eliminar el target.');
    }
  }

  async editTarget(target: ARTarget) {
    const alert = await this.alertCtrl.create({
      header: 'Editar Target',
      inputs: [
        { name: 'name', type: 'text', value: target.name, placeholder: 'Nombre' },
        { name: 'type', type: 'text', value: target.type, placeholder: 'Tipo (marker/image/nft)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            try {
              const updates: Partial<ARTarget> = { name: data.name, type: data.type as 'nft' | 'marker' | 'image' };
              await this.arTargetService.updateTarget(target.id, updates);
              if (this.currentUserId) {
                this.targets = await this.arTargetService.getTargets(this.currentUserId);
              }
              this.showToast('Target actualizado.');
            } catch {
              this.showToast('Error al actualizar.');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async logout() {
    this.targets = [];
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  private async confirm(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'OK', role: 'confirm' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private async showToast(message: string) {
    const alert = await this.alertCtrl.create({ header: 'Info', message, buttons: ['OK'] });
    await alert.present();
  }
}
