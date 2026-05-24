// Dış bilet servislerini tek noktadan çağırmak için entegrasyon kayıt defteri.
import { airlineService } from './airlineService';
import { enuygunService } from './enuygunService';
import { obiletService } from './obiletService';

export const integrationRegistry = {
  Obilet: obiletService,
  Enuygun: enuygunService,
  THY: airlineService,
  AJet: airlineService,
};
