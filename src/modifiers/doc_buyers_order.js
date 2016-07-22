/**
 * ### Модуль менеджера и документа _Заказ покупателя_
 * Обрботчики событий after_create, after_load, before_save, after_save, value_change
 * Методы выполняются в контексте текущего объекта this = DocObj
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 *
 * @module doc_buyers_order
 */

$p.modifiers.push(

	function($p) {

		var _mgr = $p.doc.buyers_order;


		// после создания надо заполнить реквизиты по умолчанию: контрагент, организация, договор
		_mgr.on("after_create", function (attr) {

			var acl = $p.current_acl.acl_objs,
				obj = this;

			//Организация
			acl.find_rows({
				by_default: true,
				type: $p.cat.organizations.metadata().obj_presentation || $p.cat.organizations.metadata().name}, function (row) {
				obj.organization = row.acl_obj;
				return false;
			});

			//Подразделение
			acl.find_rows({
				by_default: true,
				type: $p.cat.divisions.metadata().obj_presentation || $p.cat.divisions.metadata().name}, function (row) {
				obj.department = row.acl_obj;
				return false;
			});

			//Контрагент
			acl.find_rows({
				by_default: true,
				type: $p.cat.partners.metadata().obj_presentation || $p.cat.partners.metadata().name}, function (row) {
				obj.partner = row.acl_obj;
				return false;
			});

			//Договор
			obj.contract = $p.cat.contracts.by_partner_and_org(obj.partner, obj.organization);

			//Менеджер
			obj.manager = $p.current_user;

			//СостояниеТранспорта
			obj.obj_delivery_state = $p.enm.obj_delivery_states.Черновик;

			//Номер документа
			return obj.new_number_doc();

		});

		// перед записью надо присвоить номер для нового и рассчитать итоги
		_mgr.on("before_save", function (attr) {

			// если установлен признак проведения, проверим состояние транспорта
			if(this.posted){
				if (this.obj_delivery_state == $p.enm.obj_delivery_states.Отклонен ||
					this.obj_delivery_state == $p.enm.obj_delivery_states.Отозван ||
					this.obj_delivery_state == $p.enm.obj_delivery_states.Шаблон){

					$p.msg.show_msg({
						type: "alert-warning",
						text: "Нельзя провести заказ со статусом<br/>'Отклонён', 'Отозван' или 'Шаблон'",
						title: this.presentation
					});

					return false;

				}else if(this.obj_delivery_state != $p.enm.obj_delivery_states.Подтвержден){
					this.obj_delivery_state = $p.enm.obj_delivery_states.Подтвержден;

				}
			}else if(this.obj_delivery_state == $p.enm.obj_delivery_states.Подтвержден){
				this.obj_delivery_state = $p.enm.obj_delivery_states.Отправлен;
			}

			this.doc_amount = this.goods.aggregate([], ["amount"]).round(2) + this.services.aggregate([], ["amount"]).round(2);

			this._obj.partner_name = this.partner.name;
		});

		// при изменении реквизита
		_mgr.on("value_change", function (attr) {
			
			// реквизиты шапки
			if(attr.field == "organization" && this.contract.organization != attr.value){
				this.contract = $p.cat.contracts.by_partner_and_org(this.partner, attr.value);

			}else if(attr.field == "partner" && this.contract.owner != attr.value){
				this.contract = $p.cat.contracts.by_partner_and_org(attr.value, this.organization);
				
			// табчасть товаров
			}else if(attr.tabular_section == "goods"){

				if(attr.field == "nom" || attr.field == "characteristic"){
					
				}else if(attr.field == "price" || attr.field == "price_internal" || attr.field == "quantity" ||
						attr.field == "discount_percent" || attr.field == "discount_percent_internal"){
					
					attr.row[attr.field] = attr.value;
					
					attr.row.amount = (attr.row.price * ((100 - attr.row.discount_percent)/100) * attr.row.quantity).round(2);

					this.doc_amount = this.goods.aggregate([], ["amount"]).round(2) + this.services.aggregate([], ["amount"]).round(2);

					// TODO: учесть валюту документа, которая может отличаться от валюты упр. учета

				}
				
			}
		});

		// свойства и методы объекта
		_mgr._obj_constructor.prototype.__define({
			

			// валюту документа получаем из договора
			doc_currency: {
				get: function () {
					var currency = this.contract.settlements_currency;
					return currency.empty() ? $p.job_prm.pricing.main_currency : currency;
				}
			},

			/**
			 * Возвращает данные для печати
			 */
			print_data: {
				get: function () {
					var our_bank_account = this.organizational_unit && !this.organizational_unit.empty() && this.organizational_unit._manager == cat.organization_bank_accounts ?
							this.organizational_unit : this.organization.main_bank_account,
						get_imgs = [];

					// заполняем res теми данными, которые доступны синхронно
					var res = {
						АдресДоставки: this.shipping_address,
						ВалютаДокумента: this.doc_currency.presentation,
						ДатаЗаказаФорматD: $p.moment(this.date).format("L"),
						ДатаЗаказаФорматDD: $p.moment(this.date).format("LL"),
						ДатаТекущаяФорматD: $p.moment().format("L"),
						ДатаТекущаяФорматDD: $p.moment().format("LL"),
						ДоговорДатаФорматD: $p.moment(this.contract.date.valueOf() == $p.utils.blank.date.valueOf() ? this.date : this.contract.date).format("L"),
						ДоговорДатаФорматDD: $p.moment(this.contract.date.valueOf() == $p.utils.blank.date.valueOf() ? this.date : this.contract.date).format("LL"),
						ДоговорНомер: this.contract.number_doc ? this.contract.number_doc : this.number_doc,
						ДоговорСрокДействия: $p.moment(this.contract.validity).format("L"),
						ЗаказНомер: this.number_doc,
						Контрагент: this.partner.presentation,
						КонтрагентОписание: this.partner.long_presentation,
						КонтрагентДокумент: "",
						КонтрагентКЛДолжность: "",
						КонтрагентКЛДолжностьРП: "",
						КонтрагентКЛИмя: "",
						КонтрагентКЛИмяРП: "",
						КонтрагентКЛК: "",
						КонтрагентКЛОснованиеРП: "",
						КонтрагентКЛОтчество: "",
						КонтрагентКЛОтчествоРП: "",
						КонтрагентКЛФамилия: "",
						КонтрагентКЛФамилияРП: "",
						КонтрагентЮрФизЛицо: "",
						КратностьВзаиморасчетов: this.settlements_multiplicity,
						КурсВзаиморасчетов: this.settlements_course,
						ЛистКомплектацииГруппы: "",
						ЛистКомплектацииСтроки: "",
						Организация: this.organization.presentation,
						ОрганизацияГород: this.organization.contact_information._obj.reduce(function (val, row) { return val || row.city }, "") || "Москва",
						ОрганизацияАдрес: this.organization.contact_information._obj.reduce(function (val, row) {

							if(row.kind == $p.cat.contact_information_kinds.predefined("ЮрАдресОрганизации") && row.presentation)
								return row.presentation;

							else if(val)
								return val;

							else if(row.presentation && (
									row.kind == $p.cat.contact_information_kinds.predefined("ФактАдресОрганизации") ||
									row.kind == $p.cat.contact_information_kinds.predefined("ПочтовыйАдресОрганизации")
								))
								return row.presentation;

						}, ""),
						ОрганизацияТелефон: this.organization.contact_information._obj.reduce(function (val, row) {

							if(row.kind == $p.cat.contact_information_kinds.predefined("ТелефонОрганизации") && row.presentation)
								return row.presentation;

							else if(val)
								return val;

							else if(row.kind == $p.cat.contact_information_kinds.predefined("ФаксОрганизации") && row.presentation)
								return row.presentation;

						}, ""),
						ОрганизацияБанкБИК: our_bank_account.bank.id,
						ОрганизацияБанкГород: our_bank_account.bank.city,
						ОрганизацияБанкКоррСчет: our_bank_account.bank.correspondent_account,
						ОрганизацияБанкНаименование: our_bank_account.bank.name,
						ОрганизацияБанкНомерСчета: our_bank_account.account_number,
						ОрганизацияИндивидуальныйПредприниматель: this.organization.individual_entrepreneur.presentation,
						ОрганизацияИНН: this.organization.inn,
						ОрганизацияКПП: this.organization.kpp,
						ОрганизацияСвидетельствоДатаВыдачи: this.organization.certificate_date_issue,
						ОрганизацияСвидетельствоКодОргана: this.organization.certificate_authority_code,
						ОрганизацияСвидетельствоНаименованиеОргана: this.organization.certificate_authority_name,
						ОрганизацияСвидетельствоСерияНомер: this.organization.certificate_series_number,
						ОрганизацияЮрФизЛицо: this.organization.individual_legal.presentation,
						ПродукцияЭскизы: {},
						Проект: this.project.presentation,
						СистемыПрофилей: this.sys_profile,
						СистемыФурнитуры: this.sys_furn,
						Сотрудник: this.manager.presentation,
						СотрудникДолжность: this.manager.individual_person.Должность || "менеджер",
						СотрудникДолжностьРП: this.manager.individual_person.ДолжностьРП,
						СотрудникИмя: this.manager.individual_person.Имя,
						СотрудникИмяРП: this.manager.individual_person.ИмяРП,
						СотрудникОснованиеРП: this.manager.individual_person.ОснованиеРП,
						СотрудникОтчество: this.manager.individual_person.Отчество,
						СотрудникОтчествоРП: this.manager.individual_person.ОтчествоРП,
						СотрудникФамилия: this.manager.individual_person.Фамилия,
						СотрудникФамилияРП: this.manager.individual_person.ФамилияРП,
						СотрудникФИО: this.manager.individual_person.Фамилия + 
							(this.manager.individual_person.Имя ? " " + this.manager.individual_person.Имя[1].toUpperCase() + "." : "" )+
							(this.manager.individual_person.Отчество ? " " + this.manager.individual_person.Отчество[1].toUpperCase() + "." : ""),
						СотрудникФИОРП: this.manager.individual_person.ФамилияРП + " " + this.manager.individual_person.ИмяРП + " " + this.manager.individual_person.ОтчествоРП,
						СуммаДокумента: this.doc_amount.toFixed(2),
						СуммаДокументаПрописью: this.doc_amount.in_words(),
						СуммаДокументаБезСкидки: this.goods._obj.reduce(function (val, row){
							return val + row.quantity * row.price;
						}, 0).toFixed(2) + this.service._obj.reduce(function (val, row){
							return val + row.quantity * row.price;
						}, 0).toFixed(2),
						СуммаСкидки: this.goods._obj.reduce(function (val, row){
							return val + row.discount;
						}, 0).toFixed(2) + this.servise._obj.reduce(function (val, row){
							return val + row.discount;
						}, 0).toFixed(2),
						СуммаНДС: this.goods._obj.reduce(function (val, row){
							return val + row.vat_amount;
						}, 0).toFixed(2) + this.servise._obj.reduce(function (val, row){
							return val + row.vat_amount;
						}, 0).toFixed(2),
						ТекстНДС: this.vat_consider ? (this.vat_included ? "В том числе НДС 18%" : "НДС 18% (сверху)") : "Без НДС",
						ТелефонПоАдресуДоставки: this.phone,
						СуммаВключаетНДС: this.contract.vat_included,
						УчитыватьНДС: this.contract.vat_consider,
						ВсегоНаименований: this.goods.count() + this.service.count(),
						ВсегоИзделий: 0,
						ВсегоПлощадьИзделий: 0
					};

					// дополняем значениями свойств
					this.extra_fields.forEach(function (row) {
						res["Свойство" + row.property.name.replace(/\s/g,"")] = row.value.presentation || row.value;
					});

					// TODO: дополнить датами доставки и монтажа
					if(!this.shipping_address)
						res.МонтажДоставкаСамовывоз = "Самовывоз";
					else
						res.МонтажДоставкаСамовывоз = "Монтаж по адресу: " + this.shipping_address;
					
					// получаем логотип организации
					for(var key in this.organization._attachments){
						if(key.indexOf("logo") != -1){
							get_imgs.push(this.organization.get_attachment(key)
								.then(function (blob) {
									return $p.utils.blob_as_text(blob, blob.type.indexOf("svg") == -1 ? "data_url" : "")
								})
								.then(function (data_url) {
									res.ОрганизацияЛоготип = data_url;
								})
								.catch($p.record_log));
							break;
						}
					}

					return (get_imgs.length ? Promise.all(get_imgs) : Promise.resolve([]))
						.then(function () {
							
							if(!window.QRCode)
								return new Promise(function(resolve, reject){
									$p.load_script("lib/qrcodejs/qrcode.js", "script", resolve);
								});
							
						})
						.then(function () {

							var svg = document.createElement("SVG");
							svg.innerHTML = "<g />";
							var qrcode = new QRCode(svg, {
								text: "http://www.oknosoft.ru/zd/",
								width: 100,
								height: 100,
								colorDark : "#000000",
								colorLight : "#ffffff",
								correctLevel : QRCode.CorrectLevel.H,
								useSVG: true
							});
							res.qrcode = svg.innerHTML;

							return res;	
						});
				}
			},

			/**
			 * Возвращает струклуру с описанием строки продукции для печати
			 */
			row_description: {
				value: function (row) {

					var product = row.characteristic,
						res = {
							НомерСтроки: row.row,
							Количество: row.quantity,
							Ед: row.unit.name || "шт",
							Цвет: product.clr.name,
							Размеры: row.len + "x" + row.width + ", " + row.s + "м²",
							Номенклатура: row.nom.name_full || row.nom.name,
							Характеристика: product.name,
							Заполнения: "",
							Цена: row.price,
							ЦенаВнутр: row.price_internal,
							СкидкаПроцент: row.discount_percent,
							СкидкаПроцентВнутр: row.discount_percent_internal,
							Скидка: row.discount,
							Сумма: row.amount,
							СуммаВнутр: row.amount_internal
						};

					product.glasses.forEach(function (row) {
						if(res.Заполнения.indexOf(row.nom.name) == -1){
							if(res.Заполнения)
								res.Заполнения += ", ";
							res.Заполнения += row.nom.name;
						}
					});
					
					return res;
				}
			}


		});

	}

);