;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Orders = factory();
  }
}(this, function() {
/**
 * ### Дополнительные методы справочника _Договоры контрагентов_
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * 
 * @module cat_contracts
 */

$p.modifiers.push(
	function($p){

		var _mgr = $p.cat.contracts;

		/**
		 * ### Запрос для формы списка
		 *
		 * @method sql_selection_list_flds
		 * @override
		 * @param initial_value
		 * @returns {string}
		 */
		_mgr.sql_selection_list_flds = function(initial_value){
			return "SELECT _t_.ref, _t_.`_deleted`, _t_.is_folder, _t_.id, _t_.name as presentation, _k_.synonym as contract_kind, _m_.synonym as mutual_settlements, _o_.name as organization, _p_.name as partner," +
				" case when _t_.ref = '" + initial_value + "' then 0 else 1 end as is_initial_value FROM cat_contracts AS _t_" +
				" left outer join cat_organizations as _o_ on _o_.ref = _t_.organization" +
				" left outer join cat_partners as _p_ on _p_.ref = _t_.owner" +
				" left outer join enm_mutual_contract_settlements as _m_ on _m_.ref = _t_.mutual_settlements" +
				" left outer join enm_contract_kinds as _k_ on _k_.ref = _t_.contract_kind %3 %4 LIMIT 300";
		};

		/**
		 * ### Ищет договор по контрагенту и организации
		 *
		 * @param partner
		 * @param organization
		 * @param contract_kind
		 * @returns {DataObj}
		 */
		_mgr.by_partner_and_org = function (partner, organization, contract_kind) {
			if(!contract_kind)
				contract_kind = $p.enm.contract_kinds.СПокупателем;
			var res = _mgr.find_rows({owner: partner, organization: organization, contract_kind: contract_kind});
			res.sort(function (a, b) {
				return a.date > b.date;
			});
			return res.length ? res[0] : _mgr.get();
		};

	}
);
/**
 * ### Дополнительные методы справочника _Контрагенты_
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * @module cat_partners
 */

$p.modifiers.push(
	function($p){

		var _mgr = $p.cat.partners;

		/**
		 * ### Запрос поиска по строке
		 *
		 * @method sql_selection_where_flds
		 * @override
		 * @param filter
		 * @returns {string}
		 */
		_mgr.sql_selection_where_flds = function(filter){
			return " OR inn LIKE '" + filter + "' OR name_full LIKE '" + filter + "' OR name LIKE '" + filter + "'";
		};


		_mgr._obj_constructor.prototype.__define({

			/**
			 * ### Адрес контрагента
			 * Вспомогательное свойство, например, для печатных форм. Ищет адрес в табчасти контактной информации
			 * TODO: в старых конфигурациях 1С, у контрагентов и организаций нет табчасти _КонтактнаяИнформация_ в обработчике перед выгрузкой объекта нужно сформировать виртуальную табличную часть из регистра сведений _КонтактнаяИнформация_
			 */
			addr: {
				get: function () {

					return this.contact_information._obj.reduce(function (val, row) {

						if(row.kind == $p.cat.contact_information_kinds.predefined("ЮрАдресКонтрагента") && row.presentation)
							return row.presentation;

						else if(val)
							return val;

						else if(row.presentation && (
								row.kind == $p.cat.contact_information_kinds.predefined("ФактАдресКонтрагента") ||
								row.kind == $p.cat.contact_information_kinds.predefined("ПочтовыйАдресКонтрагента")
							))
							return row.presentation;

					}, "")

				}
			},

			/**
			 * ### Телефон контрагента
			 * Вспомогательное свойство, например, для печатных форм. Ищет телефон в табчасти контактной информации
			 * TODO: в старых конфигурациях 1С, у контрагентов и организаций нет табчасти _КонтактнаяИнформация_ в обработчике перед выгрузкой объекта нужно сформировать виртуальную табличную часть из регистра сведений _КонтактнаяИнформация_
			 */
			phone: {
				get: function () {

					return this.contact_information._obj.reduce(function (val, row) {

						if(row.kind == $p.cat.contact_information_kinds.predefined("ТелефонКонтрагента") && row.presentation)
							return row.presentation;

						else if(val)
							return val;

						else if(row.kind == $p.cat.contact_information_kinds.predefined("ТелефонКонтрагентаМобильный") && row.presentation)
							return row.presentation;

					}, "")
				}
			},

			/**
			 * ### полное наименование
			 * с телефоном, адресом и банковским счетом
			 */
			long_presentation: {
				get: function () {
					var res = this.name_full || this.name,
						addr = this.addr,
						phone = this.phone;

					if(this.inn)
						res+= ", ИНН" + this.inn;

					if(this.kpp)
						res+= ", КПП" + this.kpp;
					
					if(addr)
						res+= ", " + addr;

					if(phone)
						res+= ", " + phone;
					
					return res;
				}
			}
		});


	}
);
/**
 * ### Дополнительные методы справочника _Права внешних пользователей_
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * @module cat_users_acl
 */


$p.modifiers.push(
	function($p) {

		$p.cat.users_acl.__define({

			/**
			 * ### Морозит элементы справочника при загрузке
			 * чтобы права нелзя было поменять внешним скриптом
			 *
			 * @method load_array
			 */
			load_array: {
				value: function(aattr, forse){

					var ref, obj, res = [], acl;

					for(var i in aattr){

						ref = $p.utils.fix_guid(aattr[i]);

						acl = aattr[i].acl;
						if(acl)
							delete aattr[i].acl;

						if(!(obj = this.by_ref[ref])){
							obj = new this._obj_constructor(aattr[i], this);
							if(forse)
								obj._set_loaded();

						}else if(obj.is_new() || forse){
							obj._mixin(aattr[i]);
							obj._set_loaded();
						}

						if(acl && !obj._acl){
							var _acl = {};
							for(var i in acl){
								_acl.__define(i, {
									value: {},
									writable: false
								});
								for(var j in acl[i]){
									_acl[i].__define(j, {
										value: acl[i][j],
										writable: false
									});
								}
							}
							obj.__define({
								_acl: {
									value: _acl,
									writable: false
								}
							});
						}

						res.push(obj);
					}

					return res;
				}
			}
		});

		$p.cat.users_acl._obj_constructor.prototype.__define({

			/**
			 * ### Роль доступна
			 *
			 * @method role_available
			 * @param name {String}
			 * @returns {Boolean}
			 */
			role_available: {
				value: function (name) {
					return this.acl_objs._obj.some(function (row) {
						return row.type == name;
					});
				}
			},

			/**
			 * ### Идентификаторы доступных контрагентов
			 * Для пользователей с ограниченным доступом
			 *
			 * @property partners_uids
			 * @type {Array}
			 */
			partners_uids: {
				get: function () {
					var res = [];
					this.acl_objs.each(function (row) {
						if(row.acl_obj instanceof $p.cat.partners._obj_constructor)
							res.push(row.acl_obj.ref)
					});
					return res;
				}
			}
		});

	}
);

/**
 * ### Дополнительные методы ПВХ Предопределенные элементы
 * Предопределенные элементы - аналог констант для хранения ссылочных и списочных настроек приложения
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * @module cch_predefined_elmnts
 */

$p.modifiers.push(
	function($p){

		// Подписываемся на событие окончания загрузки локальных данных
		$p.on({
			pouch_load_data_loaded: function pouch_load_data_loaded() {

				$p.off(pouch_load_data_loaded);

				// читаем элементы из pouchdb и создаём свойства
				$p.cch.predefined_elmnts.pouch_find_rows({ _raw: true, _top: 500, _skip: 0 })
					.then(function (rows) {

						var parents = {};

						rows.forEach(function (row) {
							if(row.is_folder && row.synonym){
								var ref = row._id.split("|")[1];
								parents[ref] = row.synonym;
								$p.job_prm.__define(row.synonym, { value: {} });
							}
						});

						rows.forEach(function (row) {

							if(!row.is_folder && row.synonym && parents[row.parent] && !$p.job_prm[parents[row.parent]][row.synonym]){

								var _mgr, tnames;

								if(row.type.is_ref){
									tnames = row.type.types[0].split(".");
									_mgr = $p[tnames[0]][tnames[1]]
								}

								if(row.list == -1){

									$p.job_prm[parents[row.parent]].__define(row.synonym, {
										value: function () {
											var res = {};
											row.elmnts.forEach(function (row) {
												res[row.elm] = _mgr ? _mgr.get(row.value, false) : row.value;
											});
											return res;
										}()
									});

								}else if(row.list){

									$p.job_prm[parents[row.parent]].__define(row.synonym, {
										value: row.elmnts.map(function (row) {
											return _mgr ? _mgr.get(row.value, false) : row.value;
										})
									});

								}else{

									if($p.job_prm[parents[row.parent]].hasOwnProperty(row.synonym))
										delete $p.job_prm[parents[row.parent]][row.synonym];

									$p.job_prm[parents[row.parent]].__define(row.synonym, {
										value: _mgr ? _mgr.get(row.value, false) : row.value,
										configurable: true
									});
								}

							}
						});
					})
					.then(function () {

						// даём возможность завершиться другим обработчикам, подписанным на _pouch_load_data_loaded_
						setTimeout(function () {
							$p.eve.callEvent("predefined_elmnts_inited");
						}, 100);

					});

			}
		});

		var _mgr = $p.cch.predefined_elmnts;

		/**
		 * Переопределяем геттер значения
		 *
		 * @property value
		 * @override
		 * @type {*}
		 */
		delete _mgr._obj_constructor.prototype.value;
		_mgr._obj_constructor.prototype.__define({

			value: {
				get: function () {

					var mf = this.type,
						res = this._obj ? this._obj.value : "",
						mgr, ref;

					if(this._obj.is_folder)
						return "";

					if(typeof res == "object")
						return res;

					else if(mf.is_ref){
						if(mf.digits && typeof res === "number")
							return res;

						if(mf.hasOwnProperty("str_len") && !$p.utils.is_guid(res))
							return res;

						if(mgr = $p.md.value_mgr(this._obj, "value", mf)){
							if($p.utils.is_data_mgr(mgr))
								return mgr.get(res, false);
							else
								return $p.utils.fetch_type(res, mgr);
						}

						if(res){
							console.log(["value", mf, this._obj]);
							return null;
						}

					}else if(mf.date_part)
						return $p.utils.fix_date(this._obj.value, true);

					else if(mf.digits)
						return $p.utils.fix_number(this._obj.value, !mf.hasOwnProperty("str_len"));

					else if(mf.types[0]=="boolean")
						return $p.utils.fix_boolean(this._obj.value);

					else
						return this._obj.value || "";

					return this.characteristic.clr;
				},
				
				set: function (v) {

					if(this._obj.value === v)
						return;

					Object.getNotifier(this).notify({
						type: 'update',
						name: 'value',
						oldValue: this._obj.value
					});
					this._obj.value = $p.utils.is_data_obj(v) ? v.ref : v;
					this._data._modified = true;
				}
			}
		});

		/**
		 * ### Форма элемента
		 *
		 * @method form_obj
		 * @override
		 * @param pwnd
		 * @param attr
		 * @returns {*}
		 */
		_mgr.form_obj = function(pwnd, attr){

			var o, wnd;

			return this.constructor.prototype.form_obj.call(this, pwnd, attr)
				.then(function (res) {
					if(res){
						o = res.o;
						wnd = res.wnd;
						return res;
					}
				});
		}

	}
);
/**
 * ### Дополнительные методы плана видов характеристик _Свойства объектов_
 * Для поддержки дополнительных реквизитов и сведений - аналог подсистемы _Свойства_ БСП
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * @module cch_properties
 */

$p.modifiers.push(
	function($p) {

		var _mgr = $p.cch.properties;

		/**
		 * ### Проверяет заполненность обязательных полей
		 *
		 * @method check_mandatory
		 * @override
		 * @param prms {Array}
		 * @param title {String}
		 * @return {boolean}
		 */
		_mgr.check_mandatory = function(prms, title){

			var t, row;

			// проверяем заполненность полей
			for(t in prms){
				row = prms[t];
				if(row.param.mandatory && (!row.value || row.value.empty())){
					$p.msg.show_msg({
						type: "alert-error",
						text: $p.msg.bld_empty_param + row.param.presentation,
						title: title || $p.msg.bld_title});
					return true;
				}
			}

		};

		/**
		 * ### Возвращает массив доступных для данного свойства значений
		 *
		 * @method slist
		 * @override
		 * @param prop {CatObj} - планвидовхарактеристик ссылка или объект
		 * @param ret_mgr {Object} - установить в этом объекте указатель на менеджера объекта
		 * @return {Array}
		 */
		_mgr.slist = function(prop, ret_mgr){

			var res = [], rt, at, pmgr, op = this.get(prop);

			if(op && op.type.is_ref){
				// параметры получаем из локального кеша
				for(rt in op.type.types)
					if(op.type.types[rt].indexOf(".") > -1){
						at = op.type.types[rt].split(".");
						pmgr = $p[at[0]][at[1]];
						if(pmgr){

							if(ret_mgr)
								ret_mgr.mgr = pmgr;

							if(pmgr.class_name=="enm.open_directions")
								pmgr.get_option_list().forEach(function(v){
									if(v.value && v.value!=$p.enm.tso.folding)
										res.push(v);
								});

							else if(pmgr.class_name.indexOf("enm.")!=-1 || !pmgr.metadata().has_owners)
								res = pmgr.get_option_list();

							else
								pmgr.find_rows({owner: prop}, function(v){
									res.push({value: v.ref, text: v.presentation});
								});

						}
					}
			}
			return res;
		};

	}
);

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
/**
 * ### Форма списка документов _Заказ покупателя_
 * 
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * 
 * @module doc_buyers_order_form_list
 */

$p.modifiers.push(
	function($p) {

		var _mgr = $p.doc.buyers_order;

		_mgr.form_list = function(pwnd, attr){
			
			if(!attr)
				attr = {
					hide_header: true,
					date_from: new Date((new Date()).getFullYear().toFixed() + "-01-01"),
					date_till: new Date((new Date()).getFullYear().toFixed() + "-12-31"),
					on_new: function (o) {
						$p.iface.set_hash(_mgr.class_name, o.ref);
					},
					on_edit: function (_mgr, rId) {
						$p.iface.set_hash(_mgr.class_name, rId);
					}
				};

			// разбивка на 2 колонки - дерево и карусель
			var layout = pwnd.attachLayout({
				pattern: "2U",
				cells: [{
					id: "a",
					text: "Фильтр",
					collapsed_text: "Фильтр",
					width: 180
				}, {
					id: "b",
					text: "Заказы",
					header: false
				}],
				offsets: { top: 0, right: 0, bottom: 0, left: 0}
			}),

				tree = layout.cells("a").attachTree(),

				carousel = layout.cells("b").attachCarousel({
					keys:           false,
					touch_scroll:   false,
					offset_left:    0,
					offset_top:     0,
					offset_item:    0
				});

			// страницы карусели
			carousel.hideControls();
			carousel.addCell("list");
			carousel.addCell("report");
			carousel.conf.anim_step = 200;
			carousel.conf.anim_slide = "left 0.1s";

			var wnd = _mgr.form_selection(carousel.cells("list"), attr),

				report,

				filter_view = {},
				
				filter_key = {};

			// настраиваем фильтр для списка заказов
			filter_view.__define({
				value: {
					get: function () {
						switch(tree.getSelectedItemId()) {

							case 'draft':
							case 'sent':
							case 'declined':
							case 'confirmed':
							case 'zarchive':
								return 'doc/doc_buyers_order_date';

							case 'execution':
							case 'all':
								return '';
						}
					}
				}
			});
			filter_key.__define({
				value: {
					get: function () {
						var key, id;

						switch(id = tree.getSelectedItemId()) {

							case 'draft':
							case 'sent':
							case 'declined':
							case 'confirmed':
							case 'zarchive':
								key = id;
								break;

							case 'execution':
							case 'all':
								return '';
						}

						var filter = wnd.elmnts.filter.get_filter(true);
						return {
							startkey: [key, filter.date_from.getFullYear(), filter.date_from.getMonth()+1, filter.date_from.getDate()],
							endkey: [key, filter.date_till.getFullYear(), filter.date_till.getMonth()+1, filter.date_till.getDate()],
							_drop_date: true,
							_order_by: true,
							_search: filter.filter.toLowerCase()
						};
					}
				}
			});
			wnd.elmnts.filter.custom_selection._view = filter_view;
			wnd.elmnts.filter.custom_selection._key = filter_key;


			// настраиваем дерево
			tree.enableTreeImages(false);
			tree.parse($p.injected_data["tree_filteres.xml"]);
			tree.attachEvent("onSelect", function (rid) {

				// переключаем страницу карусели
				switch(rid) {

					case 'draft':
					case 'sent':
					case 'declined':
					case 'confirmed':
					case 'zarchive':
					case 'all':
						carousel.cells("list").setActive();
						wnd.elmnts.filter.call_event();
						return;
				}

				build_report(rid);

			});

			function build_report(rid) {

				carousel.cells("report").setActive();
				
				function show_report() {

					switch(rid) {

						case 'execution':
							$p.doc.buyers_order.rep_invoice_execution(report);
							break;
						
						case 'plan':
						case 'underway':
						case 'manufactured':
						case 'executed':

							$p.doc.buyers_order.rep_planing(report, rid);
							break;
					}
					
				}

				if(!report){

					report = new $p.HandsontableDocument(carousel.cells("report"), {})

						.then(function (rep) {

							if(!rep._online)
								return report = null;

							show_report();


						});

				}else if(report._online){

					show_report();
				}

				
			}

			return wnd;
		};
	}
);

/**
 * ### Форма документа _Заказ покупателя_
 * 
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * 
 * @module doc_buyers_order_form_obj
 */


$p.modifiers.push(

	function($p) {

		var _mgr = $p.doc.buyers_order,
			_meta_patched;


		_mgr.form_obj = function(pwnd, attr){

			var o, wnd, evts = [], attr_on_close = attr.on_close;

			/**
			 * структура заголовков табчасти продукции
			 * @param source
			 */
			if(!_meta_patched){
				(function(source){
					// TODO: штуки сейчас спрятаны в ro и имеют нулевую ширину
					if($p.wsql.get_user_param("hide_price_dealer")){
						source.headers = "№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка,Цена,Сумма,Скидка&nbsp;дил,Цена&nbsp;дил,Сумма&nbsp;дил";
						source.widths = "40,200,*,220,0,70,70,70,70,40,70,70,70,0,0,0";
						source.min_widths = "30,200,220,150,0,70,40,70,70,70,70,70,70,0,0,0";

					}else if($p.wsql.get_user_param("hide_price_manufacturer")){
						source.headers = "№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка&nbsp;пост,Цена&nbsp;пост,Сумма&nbsp;пост,Скидка,Цена,Сумма";
						source.widths = "40,200,*,220,0,70,70,70,70,40,0,0,0,70,70,70";
						source.min_widths = "30,200,220,150,0,70,40,70,70,70,0,0,0,70,70,70";

					}else{
						source.headers = "№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка&nbsp;пост,Цена&nbsp;пост,Сумма&nbsp;пост,Скидка&nbsp;дил,Цена&nbsp;дил,Сумма&nbsp;дил";
						source.widths = "40,200,*,220,0,70,70,70,70,40,70,70,70,70,70,70";
						source.min_widths = "30,200,220,150,0,70,40,70,70,70,70,70,70,70,70,70";
					}

					if($p.current_acl.role_available("СогласованиеРасчетовЗаказов") || $p.current_acl.role_available("РедактированиеСкидок"))
						source.types = "cntr,ref,ref,txt,ro,calck,calck,calck,calck,ref,calck,calck,ro,calck,calck,ro";
					else
						source.types = "cntr,ref,ref,txt,ro,calck,calck,calck,calck,ref,ro,ro,ro,calck,calck,ro";

				})($p.doc.buyers_order.metadata().form.obj.tabular_sections.production);
				_meta_patched = true;
			}

			attr.draw_tabular_sections = function (o, wnd, tabular_init) {

				/**
				 * получим задействованные в заказе объекты характеристик
				 */
				var refs = [];
				o.production.each(function (row) {
					if(!$p.utils.is_empty_guid(row._obj.characteristic) && row.characteristic.is_new())
						refs.push(row._obj.characteristic);
				});
				$p.cat.characteristics.pouch_load_array(refs)
					.then(function () {

						// табчасть продукции со специфическим набором кнопок
						tabular_init("goods");

						var toolbar = wnd.elmnts.tabs.tab_production.getAttachedToolbar();
						toolbar.addSpacer("btn_delete");
						toolbar.attachEvent("onclick", toolbar_click);

						// табчасть планирования
						tabular_init("planning");


						// попап для присоединенных файлов
						wnd.elmnts.discount_pop = new dhtmlXPopup({
							toolbar: toolbar,
							id: "btn_discount"
						});
						wnd.elmnts.discount_pop.attachEvent("onShow", show_discount);

						// в зависимости от статуса
						setTimeout(set_editable, 50);

					});


			};

			attr.draw_pg_header = function (o, wnd) {

				function layout_resize_finish() {
					setTimeout(function () {
						if(wnd.elmnts.layout_header.setSizes){
							wnd.elmnts.layout_header.setSizes();
							wnd.elmnts.pg_left.objBox.style.width = "100%";
							wnd.elmnts.pg_right.objBox.style.width = "100%";
						}
					}, 200);
				}

				/**
				 *	закладка шапка
				 */
				wnd.elmnts.layout_header = wnd.elmnts.tabs.tab_header.attachLayout('3U');

				wnd.elmnts.layout_header.attachEvent("onResizeFinish", layout_resize_finish);

				wnd.elmnts.layout_header.attachEvent("onPanelResizeFinish", layout_resize_finish);

				/**
				 *	левая колонка шапки документа
				 */
				wnd.elmnts.cell_left = wnd.elmnts.layout_header.cells('a');
				wnd.elmnts.cell_left.hideHeader();
				wnd.elmnts.pg_left = wnd.elmnts.cell_left.attachHeadFields({
					obj: o,
					pwnd: wnd,
					read_only: wnd.elmnts.ro,
					oxml: {
						" ": [{id: "number_doc", path: "o.number_doc", synonym: "Номер", type: "ro", txt: o.number_doc},
							{id: "date", path: "o.date", synonym: "Дата", type: "ro", txt: $p.moment(o.date).format($p.moment._masks.date_time)},
							"number_internal"
							],
						"Контактная информация": ["partner", "client_of_dealer", "phone",
							{id: "shipping_address", path: "o.shipping_address", synonym: "Адрес доставки", type: "addr", txt: o["shipping_address"]}
						],
						"Дополнительные реквизиты": [
							{id: "obj_delivery_state", path: "o.obj_delivery_state", synonym: "Состояние транспорта", type: "ro", txt: o["obj_delivery_state"].presentation},
							"category"
						]
					}
				});

				/**
				 *	правая колонка шапки документа
				 * TODO: задействовать либо удалить choice_links
				 * var choice_links = {contract: [
				 * {name: ["selection", "owner"], path: ["partner"]},
				 * {name: ["selection", "organization"], path: ["organization"]}
				 * ]};
				 */

				wnd.elmnts.cell_right = wnd.elmnts.layout_header.cells('b');
				wnd.elmnts.cell_right.hideHeader();
				wnd.elmnts.pg_right = wnd.elmnts.cell_right.attachHeadFields({
					obj: o,
					pwnd: wnd,
					read_only: wnd.elmnts.ro,
					oxml: {
						"Налоги": ["vat_consider", "vat_included"],
						"Аналитика": ["project",
							{id: "organization", path: "o.organization", synonym: "Организация", type: "refc", txt: o["organization"].presentation},
							"contract", "organizational_unit", "department"],
						"Итоги": [{id: "doc_currency", path: "o.doc_currency", synonym: "Валюта документа", type: "ro", txt: o["doc_currency"].presentation},
							{id: "doc_amount", path: "o.doc_amount", synonym: "Сумма", type: "ron", txt: o["doc_amount"]},
							{id: "amount_internal", path: "o.amount_internal", synonym: "Сумма внутр", type: "ron", txt: o["amount_internal"]}]
					}
				});

				/**
				 *	редактор комментариев
				 */
				wnd.elmnts.cell_note = wnd.elmnts.layout_header.cells('c');
				wnd.elmnts.cell_note.hideHeader();
				wnd.elmnts.cell_note.setHeight(100);
				wnd.elmnts.cell_note.attachHTMLString("<textarea class='textarea_editor'>" + o.note + "</textarea>");
				// wnd.elmnts.note_editor = wnd.elmnts.cell_note.attachEditor({
				// 	content: o.note,
				// 	onFocusChanged: function(name, ev){
				// 		if(!wnd.elmnts.ro && name == "blur")
				// 			o.note = this.getContent().replace(/&nbsp;/g, " ").replace(/<.*?>/g, "").replace(/&.{2,6};/g, "");
				// 	}
				// });

				//wnd.elmnts.pg_header = wnd.elmnts.tabs.tab_header.attachHeadFields({
				//	obj: o,
				//	pwnd: wnd,
				//	read_only: wnd.elmnts.ro    // TODO: учитывать права для каждой роли на каждый объект
				//});
			};

			attr.toolbar_struct = $p.injected_data["toolbar_buyers_order_obj.xml"];

			attr.toolbar_click = toolbar_click;

			attr.on_close = frm_close;

			return this.constructor.prototype.form_obj.call(this, pwnd, attr)
				.then(function (res) {
					if(res){
						o = res.o;
						wnd = res.wnd;
						return res;
					}
				});


			/**
			 * обработчик нажатия кнопок командных панелей
			 */
			function toolbar_click(btn_id){

				switch(btn_id) {

					case 'btn_sent':
						save("sent");
						break;

					case 'btn_save':
						save("save");
						break;

					case 'btn_save_close':
						save("close");
						break;

					case 'btn_retrieve':
						save("retrieve");
						break;

					case 'btn_post':
						save("post");
						break;

					case 'btn_unpost':
						save("unpost");
						break;


					case 'btn_close':
						wnd.close();
						break;

					case 'btn_add_builder':
						open_builder(true);
						break;

					case 'btn_add_product':
						$p.dp.buyers_order.form_product_list(wnd, process_add_product);
						break;

					case 'btn_add_material':
						add_material();
						break;

					case 'btn_edit':
						open_builder();
						break;

					case 'btn_spec':
						open_spec();
						break;

					case 'btn_discount':

						break;

					case 'btn_calendar':
						calendar_new_event();
						break;

					case 'btn_go_connection':
						go_connection();
						break;
				}

				if(btn_id.substr(0,4)=="prn_")
					_mgr.print(o, btn_id, wnd);
			}

			/**
			 * создаёт событие календаря
			 */
			function calendar_new_event(){
				$p.msg.show_not_implemented();
			}

			/**
			 * показывает список связанных документов
			 */
			function go_connection(){
				$p.msg.show_not_implemented();
			}

			/**
			 * создаёт и показывает диалог групповых скидок
			 */
			function show_discount(){
				if (!wnd.elmnts.discount) {

					wnd.elmnts.discount = wnd.elmnts.discount_pop.attachForm([
						{type: "fieldset",  name: "discounts", label: "Скидки по группам", width:220, list:[
							{type:"settings", position:"label-left", labelWidth:100, inputWidth:50},
							{type:"input", label:"На продукцию", name:"production", numberFormat:["0.0 %", "", "."]},
							{type:"input", label:"На аксессуары", name:"accessories", numberFormat:["0.0 %", "", "."]},
							{type:"input", label:"На услуги", name:"services", numberFormat:["0.0 %", "", "."]}
						]},
						{ type:"button" , name:"btn_discounts", value:"Ок", tooltip:"Установить скидки"  }
					]);
					wnd.elmnts.discount.setItemValue("production", 0);
					wnd.elmnts.discount.setItemValue("accessories", 0);
					wnd.elmnts.discount.setItemValue("services", 0);
					wnd.elmnts.discount.attachEvent("onButtonClick", function(name){
						wnd.progressOn();
						// TODO: _mgr.save
						//_mgr.save({
						//	ref: o.ref,
						//	discounts: {
						//		production: $p.utils.fix_number(wnd.elmnts.discount.getItemValue("production"), true),
						//		accessories: $p.utils.fix_number(wnd.elmnts.discount.getItemValue("accessories"), true),
						//		services: $p.utils.fix_number(wnd.elmnts.discount.getItemValue("services"), true)
						//	},
						//	o: o._obj,
						//	action: "calc",
						//	specify: "discounts"
						//}).then(function(res){
						//	if(!$p.msg.check_soap_result(res))
						//		wnd.reflect_characteristic_change(res); // - перезаполнить шапку и табчасть
						//	wnd.progressOff();
						//	wnd.elmnts.discount_pop.hide();
						//});
					});
				}
			}


			/**
			 * обработчик выбора значения в таблице продукции (ссылочные типы)
			 */
			function production_on_value_select(v){
				this.row[this.col] = v;
				this.cell.setValue(v.presentation);
				production_on_value_change();
			}

			/**
			 * РассчитатьСпецификациюСтроки() + ПродукцияПриОкончанииРедактирования()
			 * при изменении строки табчасти продукции
			 */
			function production_on_value_change(rId){

				wnd.progressOn();
				// TODO: _mgr.save
				//_mgr.save({
				//	ref: o.ref,
				//	row: rId!=undefined ? rId : production_get_sel_index(),
				//	o: o._obj,
				//	action: "calc",
				//	specify: "production"
				//}).then(function(res){
				//	if(!$p.msg.check_soap_result(res))
				//		wnd.reflect_characteristic_change(res); // - перезаполнить шапку и табчасть
				//	wnd.progressOff();
				//});
			}

			/**
			 * обработчик активизации строки продукции
			 */
			function production_on_row_activate(rId, cInd){
				var row = o["production"].get(rId-1),
					sfields = this.getUserData("", "source").fields,
					rofields = "nom,characteristic,qty,len,width,s,quantity,unit",
					pval;


				if($p.utils.is_data_obj(row.ordn) && !row.ordn.empty()){
					for(var i in sfields)
						if(rofields.indexOf(sfields[i])!=-1){
							pval = this.cells(rId, Number(i)).getValue();
							this.setCellExcellType(rId, Number(i), "ro");
							if($p.utils.is_data_obj(pval))
								this.cells(rId, Number(i)).setValue(pval.presentation);
						}
				}
			}

			/**
			 * обработчик изменения значения в таблице продукции (примитивные типы)
			 */
			function production_on_edit(stage, rId, cInd, nValue, oValue){
				if(stage != 2 || nValue == oValue) return true;
				var fName = this.getUserData("", "source").fields[cInd], ret_code;
				if(fName == "note"){
					ret_code = true;
					o["production"].get(rId-1)[fName] = nValue;
				} else if (!isNaN(Number(nValue))){
					ret_code = true;
					o["production"].get(rId-1)[fName] = Number(nValue);
				}
				if(ret_code){
					setTimeout(function(){ production_on_value_change(rId-1); } , 0);
					return ret_code;
				}
			}


			/**
			 * вспомогательные функции
			 */

			/**
			 * настройка (инициализация) табличной части продукции
			 */
			function production_init(){


				// собственно табличная часть
				var grid = wnd.elmnts.grids.production,
					source = {
						o: o,
						wnd: wnd,
						on_select: production_on_value_select,
						tabular_section: "production",
						footer_style: "text-align: right; font: bold 12px Tahoma; color: #005; background: #f9f9f9; height: 22px;"
					};
				production_captions(source);

				grid.setIconsPath(dhtmlx.image_path);
				grid.setImagePath(dhtmlx.image_path);

				// 16 полей
				//row, nom, characteristic, note, qty, len, width, s, quantity, unit, discount_percent, price, amount, discount_percent_internal, price_internal, amount_internal
				grid.setHeader(source.headers);
				grid.setInitWidths(source.widths);
				grid.setColumnMinWidth(source.min_widths);

				grid.setColumnIds(source.fields.join(","));
				grid.enableAutoWidth(true, 1200, 600);
				grid.enableEditTabOnly(true);

				grid.init();
				//grid.enableLightMouseNavigation(true);
				//grid.enableKeyboardSupport(true);
				//grid.splitAt(2);

				grid.attachFooter("Итого:,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,{#stat_total}, ,#cspan,{#stat_total}",
					[source.footer_style, "","","","","","","","","","","",source.footer_style,source.footer_style,"",source.footer_style]);

				grid.setUserData("", "source", source);
				grid.attachEvent("onEditCell", production_on_edit);
				grid.attachEvent("onRowSelect", production_on_row_activate);
			}

			function production_new_row(){
				var row = o["production"].add({
					qty: 1,
					quantity: 1,
					discount_percent_internal: $p.wsql.get_user_param("discount", "number")
				});
				o["production"].sync_grid(wnd.elmnts.grids.production);
				wnd.elmnts.grids.production.selectRowById(row.row);
				return row;
			}

			function production_get_sel_index(){
				var selId = wnd.elmnts.grids.production.getSelectedRowId();
				if(selId && !isNaN(Number(selId)))
					return Number(selId)-1;

				$p.msg.show_msg({
					type: "alert-warning",
					text: $p.msg.no_selected_row.replace("%1", "Продукция"),
					title: o.presentation
				});
			}

			function production_del_row(){

				var rId = production_get_sel_index(), row;

				if(rId == undefined)
					return;
				else
					row = o["production"].get(rId);

				// проверяем, не подчинена ли текущая строка продукции
				if($p.utils.is_data_obj(row.ordn) && !row.ordn.empty()){
					// возможно, ссылка оборвана. в этом случае, удаление надо разрешить
					if(o["production"].find({characteristic: row.ordn})){
						$p.msg.show_msg({
							type: "alert-warning",
							text: $p.msg.sub_row_change_disabled,
							title: o.presentation + ' стр. №' + (rId + 1)
						});
						return;
					}
				}

				// если удаляем строку продукции, за одно надо удалить и подчиненные аксессуары
				if($p.utils.is_data_obj(row.characteristic) && !row.characteristic.empty()){
					o["production"].find_rows({ordn: row.characteristic}).forEach(function (r) {
						o["production"].del(r);
					});
				}

			}

			function save(action){

				function do_save(post){

					if(!wnd.elmnts.ro){
						o.note = wnd.elmnts.cell_note.cell.querySelector("textarea").value.replace(/&nbsp;/g, " ").replace(/<.*?>/g, "").replace(/&.{2,6};/g, "");
						wnd.elmnts.pg_left.selectRow(0);
					}

					o.save(post)
						.then(function(){

							if(action == "sent" || action == "close")
								wnd.close();
							else{
								wnd.set_text();
								set_editable();
							}

						})
						.catch(function(err){
							$p.record_log(err);
						});
				}

				if(action == "sent"){
					// показать диалог и обработать возврат
					dhtmlx.confirm({
						title: $p.msg.order_sent_title,
						text: $p.msg.order_sent_message,
						cancel: $p.msg.cancel,
						callback: function(btn) {
							if(btn){
								// установить транспорт в "отправлено" и записать
								o.obj_delivery_state = $p.enm.obj_delivery_states.Отправлен;
								do_save();
							}
						}
					});

				} else if(action == "retrieve"){
					// установить транспорт в "отозвано" и записать
					o.obj_delivery_state =  $p.enm.obj_delivery_states.Отозван;
					do_save();

				} else if(action == "save" || action == "close"){
					do_save();

				}else if(action == "post"){
					do_save(true);

				}else if(action == "unpost"){
					do_save(false);
				}
			}

			function frm_close(){

				// выгружаем из памяти всплывающие окна скидки и связанных файлов
				["vault", "vault_pop", "discount", "discount_pop"].forEach(function (elm) {
					if (wnd && wnd.elmnts && wnd.elmnts[elm] && wnd.elmnts[elm].unload)
						wnd.elmnts[elm].unload();
				});

				evts.forEach(function (id) {
					$p.eve.detachEvent(id);
				});

				if(typeof attr_on_close == "function")
					attr_on_close();
				
				return true;
			}

			function set_editable(){

				// статусы
				var st_draft = $p.enm.obj_delivery_states.Черновик,
					st_retrieve = $p.enm.obj_delivery_states.Отозван,
					retrieve_enabed, detales_toolbar;

				wnd.elmnts.pg_right.cells("vat_consider", 1).setDisabled(true);
				wnd.elmnts.pg_right.cells("vat_included", 1).setDisabled(true);

				wnd.elmnts.ro = false;

				// технолог может изменять шаблоны
				if(o.obj_delivery_state == $p.enm.obj_delivery_states.Шаблон){
					wnd.elmnts.ro = !$p.current_acl.role_available("ИзменениеТехнологическойНСИ");

				// ведущий менеджер может изменять проведенные
				}else if(o.posted || o._deleted){
					wnd.elmnts.ro = !$p.current_acl.role_available("СогласованиеРасчетовЗаказов");

				}else if(!wnd.elmnts.ro && !o.obj_delivery_state.empty())
					wnd.elmnts.ro = o.obj_delivery_state != st_draft && o.obj_delivery_state != st_retrieve;

				retrieve_enabed = !o._deleted &&
					(o.obj_delivery_state == $p.enm.obj_delivery_states.Отправлен || o.obj_delivery_state == $p.enm.obj_delivery_states.Отклонен);

				wnd.elmnts.grids.production.setEditable(!wnd.elmnts.ro);
				wnd.elmnts.grids.planning.setEditable(!wnd.elmnts.ro);
				wnd.elmnts.pg_left.setEditable(!wnd.elmnts.ro);
				wnd.elmnts.pg_right.setEditable(!wnd.elmnts.ro);

				// гасим кнопки проведения, если недоступна роль
				if(!$p.current_acl.role_available("СогласованиеРасчетовЗаказов")){
					wnd.elmnts.frm_toolbar.hideItem("btn_post");
					wnd.elmnts.frm_toolbar.hideItem("btn_unpost");
				}

				// кнопки записи и отправки гасим в зависимости от статуса
				if(wnd.elmnts.ro){
					wnd.elmnts.frm_toolbar.disableItem("btn_sent");
					wnd.elmnts.frm_toolbar.disableItem("btn_save");

					detales_toolbar = wnd.elmnts.tabs.tab_production.getAttachedToolbar();
					detales_toolbar.forEachItem(function(itemId){
						detales_toolbar.disableItem(itemId);
					});

					detales_toolbar = wnd.elmnts.tabs.tab_planning.getAttachedToolbar();
					detales_toolbar.forEachItem(function(itemId){
						detales_toolbar.disableItem(itemId);
					});

				}else{
					// шаблоны никогда не надо отправлять
					if(o.obj_delivery_state == $p.enm.obj_delivery_states.Шаблон)
						wnd.elmnts.frm_toolbar.disableItem("btn_sent");
					else
						wnd.elmnts.frm_toolbar.enableItem("btn_sent");

					wnd.elmnts.frm_toolbar.enableItem("btn_save");

					detales_toolbar = wnd.elmnts.tabs.tab_production.getAttachedToolbar();
					detales_toolbar.forEachItem(function(itemId){
						detales_toolbar.enableItem(itemId);
					});

					detales_toolbar = wnd.elmnts.tabs.tab_planning.getAttachedToolbar();
					detales_toolbar.forEachItem(function(itemId){
						detales_toolbar.enableItem(itemId);
					});
				}
				if(retrieve_enabed)
					wnd.elmnts.frm_toolbar.enableListOption("bs_more", "btn_retrieve");
				else
					wnd.elmnts.frm_toolbar.disableListOption("bs_more", "btn_retrieve");
			}


		}

	}
);

/**
 * ### Отчеты по документу _Заказ покупателя_
 * 
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * 
 * @module doc_buyers_order_reports
 * 
 */

$p.modifiers.push(
	function($p) {

		$p.doc.buyers_order.rep_invoice_execution = function (rep) {

			var query_options = {
				reduce: true,
				limit: 10000,
				group: true,
				group_level: 3
			},
				res = {
					data: [],
					readOnly: true,
					colWidths: [180, 180, 200, 100, 100, 100, 100, 100],
					colHeaders: ['Контрагент', 'Организация', 'Заказ', 'Сумма', 'Оплачено', 'Долг', 'Отгружено', 'Отгрузить'],
					columns: [
						{type: 'text'},
						{type: 'text'},
						{type: 'text'},
						{type: 'numeric', format: '0 0.00'},
						{type: 'numeric', format: '0 0.00'},
						{type: 'numeric', format: '0 0.00'},
						{type: 'numeric', format: '0 0.00'},
						{type: 'numeric', format: '0 0.00'}
					],
					wordWrap: false
					//minSpareRows: 1
				};

			if(!$p.current_acl.role_available("СогласованиеРасчетовЗаказов")){
				//query_options.group_level = 3;
				query_options.startkey = [$p.current_acl.partners_uids[0],""];
				query_options.endkey = [$p.current_acl.partners_uids[0],"\uffff"];
			}

			return $p.wsql.pouch.remote.doc.query("server/invoice_execution", query_options)

				.then(function (data) {

					var total = {
						invoice: 0,
						pay: 0,
						total_pay: 0,
						shipment:0,
						total_shipment:0
					};

					if(data.rows){

						data.rows.forEach(function (row) {

							if(!row.value.total_pay && !row.value.total_shipment)
								return;

							res.data.push([
								$p.cat.partners.get(row.key[0]).presentation,
								$p.cat.organizations.get(row.key[1]).presentation,
								row.key[2],
								row.value.invoice,
								row.value.pay,
								row.value.total_pay,
								row.value.shipment,
								row.value.total_shipment]);

							total.invoice+= row.value.invoice;
							total.pay+=row.value.pay;
							total.total_pay+=row.value.total_pay;
							total.shipment+=row.value.shipment;
							total.total_shipment+=row.value.total_shipment;
						});

						res.data.push([
							"Итого:",
							"",
							"",
							total.invoice,
							total.pay,
							total.total_pay,
							total.shipment,
							total.total_shipment]);

						res.mergeCells= [
							{row: res.data.length-1, col: 0, rowspan: 1, colspan: 3}
						]
					}

					rep.requery(res);

					return res;
				});
		};

	}
);
/**
 * ### Модуль Ценообразование
 * Содержит методы для работы с ценами номенклатуры
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 */

$p.modifiers.push(
	function($p){

		// экспортируем класс Pricing (модуль ценообразования)
		$p.pricing = new Pricing($p);

		// методы ценообразования в прототип номенклатуры
		$p.cat.nom._obj_constructor.prototype.__define({

			/**
			 * ### Возвращает цену номенклатуры указанного типа
			 * - на дату
			 * - с подбором характеристики по цвету
			 * - с пересчетом из валюты в валюту
			 *
			 * @method _price
			 * @for $p.cat.nom
			 */
			_price: {
				value: function (attr) {
					
					if(!attr)
						attr = {};

					if(!attr.price_type)
						attr.price_type = $p.job_prm.pricing.price_type_sale;
					else if($p.utils.is_data_obj(attr.price_type))
						attr.price_type = attr.price_type.ref;

					if(!attr.characteristic)
						attr.characteristic = $p.utils.blank.guid;
					else if($p.utils.is_data_obj(attr.characteristic))
						attr.characteristic = attr.characteristic.ref;

					if(!attr.date)
						attr.date = new Date();

					var price = 0, currency, date = $p.utils.blank.date;

					if(this._data._price){
						if(this._data._price[attr.characteristic]){
							if(this._data._price[attr.characteristic][attr.price_type]){
								this._data._price[attr.characteristic][attr.price_type].forEach(function (row) {
									if(row.date > date && row.date <= attr.date){
										price = row.price;
										currency = row.currency;
									}
								})
							}
						}else if(attr.characteristic != $p.utils.blank.guid && this._data._price[$p.utils.blank.guid]){
							// если нет цены с характеристикой, возвращаем цену без характеристики
							if(this._data._price[$p.utils.blank.guid][attr.price_type]){
								this._data._price[$p.utils.blank.guid][attr.price_type].forEach(function (row) {
									if(row.date > date && row.date <= attr.date){
										price = row.price;
										currency = row.currency;
									}
								})
							}
						}
					}

					// Пересчитать из валюты в валюту
					return $p.pricing.from_currency_to_currency(price, attr.date, currency, attr.currency);

				}
			}
		});


		function Pricing($p){

			/**
			 * ### Пересчитывает сумму из валюты в валюту
			 *
			 * @method from_currency_to_currency
			 * @param amount {Number} - сумма к пересчету
			 * @param date {Date} - дата курса
			 * @param from - исходная валюта
			 * @param [to] - конечная валюта
			 * @return {Number}
			 */
			this.from_currency_to_currency = function (amount, date, from, to) {

				if(!to || to.empty())
					to = $p.job_prm.pricing.main_currency;
				
				if(!from || from == to)
					return amount;
				
				if(!date)
					date = new Date();

				if(!this.cource_sql)
					this.cource_sql = $p.wsql.alasql.compile("select top 1 * from `ireg_currency_courses` where `currency` = ? and `period` <= ? order by `date` desc");

				var cfrom = {course: 1, multiplicity: 1}, 
					cto = {course: 1, multiplicity: 1},
					tmp;
				if(from != $p.job_prm.pricing.main_currency){
					tmp = this.cource_sql([from.ref, date]);
					if(tmp.length)
						cfrom = tmp[0];
				}
				if(to != $p.job_prm.pricing.main_currency){
					tmp = this.cource_sql([to.ref, date]);
					if(tmp.length)
						cto = tmp[0];
				}

				return (amount * cfrom.course / cfrom.multiplicity) * cto.multiplicity / cto.course;
			};


			// виртуальный срез последних
			function build_cache() {

				return $p.doc.nom_prices_setup.pouch_db.query("doc/doc_nom_prices_setup_slice_last",
					{
						limit : 1000,
						include_docs: false,
						startkey: [''],
						endkey: ['\uffff']
						// ,reduce: function(keys, values, rereduce) {
						// 	return values.length;
						// }
					})
					.then(function (res) {
						res.rows.forEach(function (row) {

							var onom = $p.cat.nom.get(row.key[0], false, true);

							if(!onom || !onom._data)
								return;
							
							if(!onom._data._price)
								onom._data._price = {};

							if(!onom._data._price[row.key[1]])
								onom._data._price[row.key[1]] = {};

							if(!onom._data._price[row.key[1]][row.key[2]])
								onom._data._price[row.key[1]][row.key[2]] = [];

							onom._data._price[row.key[1]][row.key[2]].push({
								date: new Date(row.value.date),
								price: row.value.price,
								currency: $p.cat.currencies.get(row.value.currency)
							});

						});
					});
			}

			$p.on({

				// подписываемся на событие после загрузки из pouchdb-ram и готовности предопределенных
				predefined_elmnts_inited: function predefined_elmnts_inited() {
					$p.off(predefined_elmnts_inited);
					build_cache();
				},

				// следим за изменениями документа установки цен, чтобы при необходимости обновить кеш
				pouch_change: function (dbid, change) {
					if (dbid != $p.doc.nom_prices_setup.cachable)
						return;

					// формируем новый
				}

			});

		}

	}
);

$p.injected_data._mixin({"view_about.html":"<div class=\"md_column1300\">\r\n    <h1><i class=\"fa fa-info-circle\"></i> Заказы онлайн</h1>\r\n    <p>Заказы онлайн - это веб-приложение на базе фреймворка <a href=\"http://www.oknosoft.ru/metadata/\" target=\"_blank\">Metadata.js</a><br />\r\n        Исходный код и документация доступны на <a href=\"https://github.com/oknosoft/order-online\" target=\"_blank\">GitHub <i class=\"fa fa-github-alt\"></i></a>.<br />\r\n    </p>\r\n\r\n    <h3>Назначение и возможности</h3>\r\n    <ul>\r\n        <li>Создание и редактирование документов <i>Заказ покупателя</i> для типовых конфигураций 1С</li>\r\n        <li>Заказы формируются с тем же набором и типами полей, что и в стандартной 1С<br />(реплицируются справочники <i>Контрагенты, Партнеры, Договоры, Организации, Номенклатура, Характеристики, Серии, Склады</i> и т.д. -<br />все ссылочные типы, задействованные в подсистеме управления продажами)</li>\r\n        <li>Фоновый двусторонний обмен изменений объектов с ИБ 1С</li>\r\n        <li>Гибкая настройка видимости и доступности объектов и реквизитов для групп пользователей</li>\r\n        <li>Формирование печатных форм счетов и заказов</li>\r\n        <li>Формирование отчетов об оплате и отгрузке по заказам</li>\r\n        <li>Поддержка автономной работы при отсутствии доступа в Интернет и прозрачного обмена с сервером при возобновлении соединения</li>\r\n        <li>Синхронизация заказов не только базой поставщика, но так же и с учетными системами клиентов и дилеров</li>\r\n    </ul>\r\n\r\n    <h3>Использованы следующие библиотеки и инструменты:</h3>\r\n    <h4>Серверная часть</h4>\r\n    <ul>\r\n        <li><a href=\"http://couchdb.apache.org/\" target=\"_blank\">couchDB</a>, NoSQL база данных с поддержкой master-master репликации</li>\r\n        <li><a href=\"http://nginx.org/ru/\" target=\"_blank\">nginx</a>, высокопроизводительный HTTP-сервер</li>\r\n        <li><a href=\"http://1c-dn.com/1c_enterprise/\" target=\"_blank\">1c_enterprise</a>, ORM сервер 1С:Предприятие</li>\r\n    </ul>\r\n\r\n    <h4>Управление данными в памяти браузера</h4>\r\n    <ul>\r\n        <li><a href=\"https://pouchdb.com/\" target=\"_blank\">pouchDB</a>, клиентская NoSQL база данных с поддержкой автономной работы и репликации с CouchDB</li>\r\n        <li><a href=\"https://github.com/agershun/alasql\" target=\"_blank\">alaSQL</a>, база данных SQL для браузера и Node.js с поддержкой как традиционных реляционных таблиц, так и вложенных JSON данных (NoSQL)</li>\r\n    </ul>\r\n\r\n    <h4>UI библиотеки и компоненты интерфейса</h4>\r\n    <ul>\r\n        <li><a href=\"http://dhtmlx.com/\" target=\"_blank\">dhtmlx</a>, кроссбраузерная библиотека javascript для построения современных веб и мобильных приложений</li>\r\n        <li><a href=\"https://handsontable.com/\" target=\"_blank\">handsontable</a>, компонент для отображения и редактирования табличных данных</li>\r\n        <li><a href=\"https://github.com/eligrey/FileSaver.js\" target=\"_blank\">filesaver.js</a>, HTML5 реализация метода saveAs</li>\r\n        <li><a href=\"http://momentjs.com/\" target=\"_blank\">moment.js</a>, библиотека форматирования интервалов и дат</li>\r\n        <li><a href=\"https://github.com/SheetJS/js-xlsx\" target=\"_blank\">xlsx</a>, библиотека для чтения и записи XLSX / XLSM / XLSB / XLS / ODS в браузере</li>\r\n    </ul>\r\n\r\n    <h4>Графика</h4>\r\n    <ul>\r\n        <li><a href=\"https://fortawesome.github.io/Font-Awesome/\" target=\"_blank\">fontawesome</a>, набор шрифтовых иконок</li>\r\n    </ul>\r\n\r\n    <h3>Лицензия</h3>\r\n    <p>Для некоммерческих Open Source проектов, разрешено использование и распространение исходного кода приложения\r\n        <a href=\"https://github.com/oknosoft/order-online\" target=\"_blank\">Заказы онлайн</a> и библиотеки\r\n        <a href=\"http://www.oknosoft.ru/metadata/\" target=\"_blank\">Metadata.js</a><br />на условиях\r\n        <a href=\"http://www.gnu.org/licenses/agpl.html\" target=\"_blank\">GNU Affero General Public License v.3</a>.<br />\r\n        Коммерческая <a href=\"http://www.oknosoft.ru/programmi-oknosoft/metadata.html\" target=\"_blank\">лицензия на разработчика</a> позволяет использовать и распространять ПО в любом количестве неконкурирующих продуктов, без ограничений на количество копий\r\n    </p>\r\n\r\n    <h3><i class=\"fa fa-question-circle\"></i> Вопросы</h3>\r\n    <p>Если обнаружили ошибку, пожалуйста,\r\n        <a href=\"https://github.com/oknosoft/order-online/issues/new\" target=\"_blank\">зарегистрируйте вопрос в GitHub</a> или\r\n        <a href=\"http://www.oknosoft.ru/metadata/#page-118\" target=\"_blank\">свяжитесь с разработчиком</a> напрямую<br /></p>\r\n    <p>&nbsp;</p>\r\n\r\n</div>","view_settings.html":"<div class=\"md_column1300\">\r\n\r\n    <div class=\"md_column320\" name=\"form1\" style=\"max-width: 400px;\"><div></div></div>\r\n\r\n    <div class=\"md_column320\" name=\"form2\" style=\"max-width: 400px;\"><div></div></div>\r\n\r\n</div>","toolbar_buyers_order_obj.xml":"<?xml version=\"1.0\" encoding='utf-8'?>\r\n<toolbar>\r\n    <item id=\"sep0\" type=\"separator\"/>\r\n    <item type=\"button\" id=\"btn_save_close\" text=\"&lt;i class='fa fa-caret-square-o-down fa-fw'&gt;&lt;/i&gt;\" title=\"Записать и закрыть\"/>\r\n    <item type=\"button\" id=\"btn_save\" text=\"&lt;i class='fa fa-floppy-o fa-fw'&gt;&lt;/i&gt;\" title=\"Записать\"/>\r\n    <item type=\"button\" id=\"btn_sent\" text=\"&lt;i class='fa fa-paper-plane-o fa-fw'&gt;&lt;/i&gt;\" title=\"Отправить заказ\" />\r\n\r\n    <item type=\"button\" id=\"btn_post\" enabled=\"false\" text=\"&lt;i class='fa fa-check-square-o fa-fw'&gt;&lt;/i&gt;\" title=\"Провести документ\" />\r\n    <item type=\"button\" id=\"btn_unpost\" enabled=\"false\" text=\"&lt;i class='fa fa-square-o fa-fw'&gt;&lt;/i&gt;\" title=\"Отмена проведения\" />\r\n\r\n    <item type=\"button\" id=\"btn_files\" text=\"&lt;i class='fa fa-paperclip fa-fw'&gt;&lt;/i&gt;\" title=\"Присоединенные файлы\"/>\r\n\r\n    <item type=\"buttonSelect\" id=\"bs_print\" text=\"&lt;i class='fa fa-print fa-fw'&gt;&lt;/i&gt;\" title=\"Печать\" openAll=\"true\">\r\n    </item>\r\n\r\n    <item type=\"buttonSelect\" id=\"bs_create_by_virtue\" text=\"&lt;i class='fa fa-bolt fa-fw'&gt;&lt;/i&gt;\" title=\"Создать на основании\" openAll=\"true\" >\r\n        <item type=\"button\" id=\"btn_message\" enabled=\"false\" text=\"Сообщение\" />\r\n    </item>\r\n\r\n    <item type=\"buttonSelect\" id=\"bs_go_to\" text=\"&lt;i class='fa fa-external-link fa-fw'&gt;&lt;/i&gt;\" title=\"Перейти\" openAll=\"true\" >\r\n        <item type=\"button\" id=\"btn_go_connection\" enabled=\"false\" text=\"Связи\" />\r\n    </item>\r\n\r\n    <item type=\"buttonSelect\"   id=\"bs_more\"  text=\"&lt;i class='fa fa-th-large fa-fw'&gt;&lt;/i&gt;\"  title=\"Дополнительно\" openAll=\"true\">\r\n        <item type=\"button\"     id=\"btn_retrieve\"    text=\"&lt;i class='fa fa-undo fa-fw'&gt;&lt;/i&gt; Отозвать\" title=\"Отозвать заказ\" />\r\n        <item type=\"separator\"  id=\"sep_export\" />\r\n        <item type=\"button\" id=\"btn_import\" text=\"&lt;i class='fa fa-upload fa-fw'&gt;&lt;/i&gt; Загрузить из файла\" />\r\n        <item type=\"button\" id=\"btn_export\" text=\"&lt;i class='fa fa-download fa-fw'&gt;&lt;/i&gt; Выгрузить в файл\" />\r\n    </item>\r\n\r\n    <item id=\"sep_close_1\" type=\"separator\"/>\r\n    <item type=\"button\" id=\"btn_close\" text=\"&lt;i class='fa fa-times fa-fw'&gt;&lt;/i&gt;\" title=\"Закрыть форму\"/>\r\n    <item id=\"sep_close_2\" type=\"separator\"/>\r\n\r\n</toolbar>","tree_filteres.xml":"<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<tree id=\"0\">\r\n    <item id=\"draft\" text=\"&lt;i class='fa fa-pencil fa-fw'&gt;&lt;/i&gt; Черновики\" select=\"1\" tooltip=\"Предварительные расчеты\"/>\r\n    <item id=\"sent\" text=\"&lt;i class='fa fa-paper-plane-o fa-fw'&gt;&lt;/i&gt; Отправлено\" tooltip=\"Отправленные, но еще не принятые в работу. Могут быть отозваны (переведены в 'черновики')\" />\r\n    <item id=\"confirmed\" text=\"&lt;i class='fa fa-thumbs-o-up fa-fw'&gt;&lt;/i&gt; Согласовано\" tooltip=\"Включены в план производства. Могут быть изменены менеджером. Недоступны для изменения дилером\" />\r\n    <item id=\"declined\" text=\"&lt;i class='fa fa-thumbs-o-down fa-fw'&gt;&lt;/i&gt; Отклонено\" tooltip=\"Не приняты в работу по техническим причинам. Требуется изменение конструктива или комплектации\" />\r\n    <item id=\"execution\" text=\"&lt;i class='fa fa-money fa-fw'&gt;&lt;/i&gt; Долги\" tooltip=\"Оплата, отгрузка\" />\r\n    <item id=\"zarchive\" text=\"&lt;i class='fa fa-archive fa-fw'&gt;&lt;/i&gt; Архив\" tooltip=\"Старые заказы\" />\r\n    <item id=\"all\" text=\"&lt;i class='fa fa-expand fa-fw'&gt;&lt;/i&gt; Все\" tooltip=\"Отключить фильтрацию\" />\r\n</tree>\r\n","create_tables.sql":"USE md;\nCREATE TABLE IF NOT EXISTS `ireg_$log` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, `date` INT, `sequence` INT, `class` CHAR, `note` CHAR, `obj` CHAR);\nCREATE TABLE IF NOT EXISTS `doc_nom_prices_setup` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, posted boolean, date Date, number_doc CHAR, `Комментарий` CHAR, `Ответственный` CHAR, `НеПроводитьНулевыеЗначения` BOOLEAN, `Информация` CHAR, `ts_goods` JSON, `ts_ТипыЦен` JSON);\nCREATE TABLE IF NOT EXISTS `doc_credit_cash_order` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `Касса` CHAR, `department` CHAR, `Ответственный` CHAR, `Выдать` CHAR, `Основание` CHAR, `contract` CHAR, `ВалютаВзаиморасчетовРаботника` CHAR, `doc_currency` CHAR, `Приложение` CHAR, `ДатаПогашенияАванса` Date, `РасчетныйДокумент` CHAR, `РасчетныйДокумент_T` CHAR, `ПоДокументу` CHAR, `ОтражатьВУправленческомУчете` BOOLEAN, `ОтражатьВБухгалтерскомУчете` BOOLEAN, `Комментарий` CHAR, `ОтраженоВОперУчете` BOOLEAN, `Оплачено` BOOLEAN, `partner` CHAR, `partner_T` CHAR, `ВидОперации` CHAR, `doc_amount` FLOAT, `ДокументОснование` CHAR, `ДокументОснование_T` CHAR, `ОтражатьВНалоговомУчете` BOOLEAN, `СубконтоДт1` CHAR, `СубконтоДт1_T` CHAR, `СубконтоДт2` CHAR, `СубконтоДт2_T` CHAR, `СубконтоДт3` CHAR, `СубконтоДт3_T` CHAR, `СчетУчетаРасчетовСКонтрагентом` CHAR, `cash_flow_article` CHAR, `СчетОрганизации` CHAR, `Содержание_УСН` CHAR, `Графа4_УСН` FLOAT, `Графа5_УСН` FLOAT, `Графа6_УСН` FLOAT, `Графа7_УСН` FLOAT, `ДоходыЕНВД_УСН` BOOLEAN, `РасходыЕНВД_УСН` BOOLEAN, `НДС_УСН` FLOAT, `РучнаяНастройка_УСН` BOOLEAN, `ВидВыдачиДенежныхСредств` CHAR, `ОбъявлениеНаВзносНаличными` CHAR, `НомерЧекаККМ` INT, `СчетУчетаРасчетовСКонтрагентомНУ` CHAR, `СубконтоНУДт1` CHAR, `СубконтоНУДт1_T` CHAR, `СубконтоНУДт2` CHAR, `СубконтоНУДт2_T` CHAR, `СубконтоНУДт3` CHAR, `СубконтоНУДт3_T` CHAR, `ts_ВыплатаЗаработнойПлаты` JSON, `ts_РасшифровкаПлатежа` JSON, `ts_ВыплатаДепонентов` JSON, `ts_individuals` JSON);\nCREATE TABLE IF NOT EXISTS `doc_debit_cash_order` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `Касса` CHAR, `department` CHAR, `ВидОперации` CHAR, `partner` CHAR, `partner_T` CHAR, `contract` CHAR, `ВалютаВзаиморасчетовПодотчетника` CHAR, `doc_currency` CHAR, `doc_amount` FLOAT, `ПринятоОт` CHAR, `Основание` CHAR, `Приложение` CHAR, `Ответственный` CHAR, `ОтраженоВОперУчете` BOOLEAN, `Оплачено` BOOLEAN, `Комментарий` CHAR, `ОтражатьВУправленческомУчете` BOOLEAN, `ДокументОснование` CHAR, `ДокументОснование_T` CHAR, `ОтражатьВБухгалтерскомУчете` BOOLEAN, `РасчетныйДокумент` CHAR, `РасчетныйДокумент_T` CHAR, `ОтражатьВНалоговомУчете` BOOLEAN, `СчетУчетаРасчетовСКонтрагентом` CHAR, `СубконтоКт1` CHAR, `СубконтоКт1_T` CHAR, `СубконтоКт2` CHAR, `СубконтоКт2_T` CHAR, `СубконтоКт3` CHAR, `СубконтоКт3_T` CHAR, `СчетОрганизации` CHAR, `cash_flow_article` CHAR, `vat_rate` CHAR, `Содержание_УСН` CHAR, `Графа4_УСН` FLOAT, `Графа5_УСН` FLOAT, `Графа6_УСН` FLOAT, `Графа7_УСН` FLOAT, `ДоходыЕНВД_УСН` BOOLEAN, `РасходыЕНВД_УСН` BOOLEAN, `НДС_УСН` FLOAT, `РучнаяНастройка_УСН` BOOLEAN, `ВыручкаСНТТ` BOOLEAN, `НомерЧекаККМ` INT, `ВидПриемаРозничнойВыручки` CHAR, `ДенежныйЧек` CHAR, `ts_РасшифровкаПлатежа` JSON);\nCREATE TABLE IF NOT EXISTS `doc_credit_bank_order` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, posted boolean, date Date, number_doc CHAR, `ДокументОснование` CHAR, `ДокументОснование_T` CHAR, `organization` CHAR, `СчетОрганизации` CHAR, `partner` CHAR, `ДатаОплаты` Date, `СчетКонтрагента` CHAR, `contract` CHAR, `ВидПлатежа` CHAR, `ОчередностьПлатежа` INT, `НазначениеПлатежа` CHAR, `ТекстПлательщика` CHAR, `doc_currency` CHAR, `ТекстПолучателя` CHAR, `Комментарий` CHAR, `Оплачено` BOOLEAN, `ИННПлательщика` CHAR, `КПППлательщика` CHAR, `ИННПолучателя` CHAR, `КПППолучателя` CHAR, `Ответственный` CHAR, `ОтражатьВБухгалтерскомУчете` BOOLEAN, `КодБК` CHAR, `ОтраженоВОперУчете` BOOLEAN, `КодОКАТО` CHAR, `ПоказательДаты` Date, `ПоказательНомера` CHAR, `ПоказательОснования` CHAR, `ПоказательПериода` CHAR, `ПоказательТипа` CHAR, `СтатусСоставителя` CHAR, `doc_amount` FLOAT, `ВидОперации` CHAR, `cash_flow_article` CHAR, `СчетУчетаРасчетовСКонтрагентом` CHAR, `СубконтоДт1` CHAR, `СубконтоДт1_T` CHAR, `СубконтоДт2` CHAR, `СубконтоДт2_T` CHAR, `СубконтоДт3` CHAR, `СубконтоДт3_T` CHAR, `ОтражатьВНалоговомУчете` BOOLEAN, `ФизЛицо` CHAR, `ДоговорЗайма` CHAR, `ВалютаВзаиморасчетовРаботника` CHAR, `ЧастичнаяОплата` BOOLEAN, `Содержание_УСН` CHAR, `Графа4_УСН` FLOAT, `Графа5_УСН` FLOAT, `Графа6_УСН` FLOAT, `Графа7_УСН` FLOAT, `ДоходыЕНВД_УСН` BOOLEAN, `РасходыЕНВД_УСН` BOOLEAN, `НДС_УСН` FLOAT, `РучнаяНастройка_УСН` BOOLEAN, `department` CHAR, `СчетУчетаРасчетовСКонтрагентомНУ` CHAR, `СубконтоНУДт1` CHAR, `СубконтоНУДт1_T` CHAR, `СубконтоНУДт2` CHAR, `СубконтоНУДт2_T` CHAR, `СубконтоНУДт3` CHAR, `СубконтоНУДт3_T` CHAR, `ДатаПогашенияАванса` Date, `РасчетныйДокументРаботника` CHAR, `ПеречислениеВБюджет` BOOLEAN, `ВидПеречисленияВБюджет` CHAR, `ИдентификаторПлатежа` CHAR, `ts_ПеречислениеЗаработнойПлаты` JSON, `ts_РасшифровкаПлатежа` JSON, `ts_РеквизитыКонтрагента` JSON, `ts_Работники` JSON);\nCREATE TABLE IF NOT EXISTS `doc_debit_bank_order` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, posted boolean, date Date, number_doc CHAR, `doc_currency` CHAR, `ВидОперации` CHAR, `contract` CHAR, `ДокументОснование` CHAR, `ДокументОснование_T` CHAR, `Комментарий` CHAR, `partner` CHAR, `НомерВходящегоДокумента` CHAR, `ДатаВходящегоДокумента` Date, `Оплачено` BOOLEAN, `organization` CHAR, `Ответственный` CHAR, `ОтраженоВОперУчете` BOOLEAN, `ОтражатьВНалоговомУчете` BOOLEAN, `ДатаОплаты` Date, `ЧастичнаяОплата` BOOLEAN, `cash_flow_article` CHAR, `СубконтоКт1` CHAR, `СубконтоКт1_T` CHAR, `ОтражатьВБухгалтерскомУчете` BOOLEAN, `СубконтоКт2` CHAR, `СубконтоКт2_T` CHAR, `СубконтоКт3` CHAR, `СубконтоКт3_T` CHAR, `doc_amount` FLOAT, `СчетКонтрагента` CHAR, `СчетОрганизации` CHAR, `СчетУчетаРасчетовСКонтрагентом` CHAR, `Содержание_УСН` CHAR, `Графа4_УСН` FLOAT, `Графа5_УСН` FLOAT, `Графа6_УСН` FLOAT, `Графа7_УСН` FLOAT, `ДоходыЕНВД_УСН` BOOLEAN, `РасходыЕНВД_УСН` BOOLEAN, `НДС_УСН` FLOAT, `РучнаяНастройка_УСН` BOOLEAN, `department` CHAR, `НазначениеПлатежа` CHAR, `СчетУчетаРасчетовСКонтрагентомНУ` CHAR, `СубконтоНУКт1` CHAR, `СубконтоНУКт1_T` CHAR, `СубконтоНУКт2` CHAR, `СубконтоНУКт2_T` CHAR, `СубконтоНУКт3` CHAR, `СубконтоНУКт3_T` CHAR, `cost_item` CHAR, `nom_group` CHAR, `ПодразделениеЗатраты` CHAR, `ПодразделениеОрганизацииЗатраты` CHAR, `СуммаУслуг` FLOAT, `ts_РасшифровкаПлатежа` JSON, `ts_РеквизитыКонтрагента` JSON);\nCREATE TABLE IF NOT EXISTS `doc_debt_adjustment` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `ВидОперации` CHAR, `department` CHAR, `КонтрагентДебитор` CHAR, `КонтрагентКредитор` CHAR, `ОтражатьВУправленческомУчете` BOOLEAN, `ОтражатьВБухгалтерскомУчете` BOOLEAN, `Комментарий` CHAR, `Ответственный` CHAR, `ОтражатьВНалоговомУчете` BOOLEAN, `doc_currency` CHAR, `КурсДокумента` FLOAT, `КратностьДокумента` INT, `contract` CHAR, `ИспользоватьВспомогательныйСчет` BOOLEAN, `СчетДт` CHAR, `СубконтоДт1` CHAR, `СубконтоДт1_T` CHAR, `СубконтоДт2` CHAR, `СубконтоДт2_T` CHAR, `СубконтоДт3` CHAR, `СубконтоДт3_T` CHAR, `СчетКт` CHAR, `СубконтоКт1` CHAR, `СубконтоКт1_T` CHAR, `СубконтоКт2` CHAR, `СубконтоКт2_T` CHAR, `СубконтоКт3` CHAR, `СубконтоКт3_T` CHAR, `СчетДтНУ` CHAR, `СубконтоДтНУ1` CHAR, `СубконтоДтНУ1_T` CHAR, `СубконтоДтНУ2` CHAR, `СубконтоДтНУ2_T` CHAR, `СубконтоДтНУ3` CHAR, `СубконтоДтНУ3_T` CHAR, `СчетКтНУ` CHAR, `СубконтоКтНУ1` CHAR, `СубконтоКтНУ1_T` CHAR, `СубконтоКтНУ2` CHAR, `СубконтоКтНУ2_T` CHAR, `СубконтоКтНУ3` CHAR, `СубконтоКтНУ3_T` CHAR, `ДокументОснование` CHAR, `ts_СуммыДолга` JSON);\nCREATE TABLE IF NOT EXISTS `doc_buyers_order` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, posted boolean, date Date, number_doc CHAR, `АдресДоставки` CHAR, `doc_currency` CHAR, `ВидОперации` CHAR, `ВремяНапоминания` Date, `ДатаОплаты` Date, `ДатаОтгрузки` Date, `contract` CHAR, `ИспользоватьПлановуюСебестоимость` BOOLEAN, `ИтогПлановаяСебестоимость` FLOAT, `Комментарий` CHAR, `partner` CHAR, `КратностьВзаиморасчетов` INT, `КурсВзаиморасчетов` FLOAT, `НапомнитьОСобытии` BOOLEAN, `organization` CHAR, `Ответственный` CHAR, `ОтражатьВБухгалтерскомУчете` BOOLEAN, `ОтражатьВНалоговомУчете` BOOLEAN, `department` CHAR, `СтруктурнаяЕдиница` CHAR, `СтруктурнаяЕдиница_T` CHAR, `СкладГруппа` CHAR, `СкладГруппа_T` CHAR, `vat_included` BOOLEAN, `doc_amount` FLOAT, `price_type` CHAR, `vat_consider` BOOLEAN, `Грузополучатель` CHAR, `КонтактноеЛицоКонтрагента` CHAR, `УсловиеПродаж` CHAR, `ДополнениеКАдресуДоставки` CHAR, `ДокументОснование` CHAR, `ДокументОснование_T` CHAR, `Грузоотправитель` CHAR, `НомерПоДаннымПокупателя` CHAR, `ДатаПоДаннымПокупателя` Date, `УсловияДоставки` CHAR, `ДатаПоставки` Date, `obj_delivery_state` CHAR, `ts_goods` JSON, `ts_ВозвратнаяТара` JSON, `ts_services` JSON, `ts_Материалы` JSON, `ts_СоставНабора` JSON, `ts_ПараметрыВыпускаПродукции` JSON);\nCREATE TABLE IF NOT EXISTS `cat_price_groups` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `sequence` INT, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_characteristics` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `ОКП` CHAR, `Активная` BOOLEAN, `owner` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_individuals` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `ДатаРождения` Date, `ИНН` CHAR, `КодИМНС` CHAR, `Комментарий` CHAR, `СтраховойНомерПФР` CHAR, `Пол` CHAR, `МестоРождения` CHAR, `ОсновноеИзображение` CHAR, `МестоРожденияКодПоОКАТО` CHAR, `ГруппаДоступаФизическогоЛица` CHAR, `ЛьготаПриНачисленииПособий` CHAR, `ИмеетНаучныеТруды` BOOLEAN, `ИмеетИзобретения` BOOLEAN, `ПостоянноПроживалВКрыму18Марта2014Года` BOOLEAN, `Должность` CHAR, `Фамилия` CHAR, `Имя` CHAR, `Отчество` CHAR, `parent` CHAR, `ts_СоставСемьи` JSON, `ts_Образование` JSON, `ts_ТрудоваяДеятельность` JSON, `ts_ЗнаниеЯзыков` JSON, `ts_Профессии` JSON, `ts_Стажи` JSON, `ts_Награды` JSON, `ts_УченыеСтепени` JSON, `ts_УченыеЗвания` JSON);\nCREATE TABLE IF NOT EXISTS `cat_sale_conditions` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `cat_nom_prices_types_partners` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `price_currency` CHAR, `vat_price_included` BOOLEAN, `ТипЦеныНоменклатуры` CHAR, `ОписаниеТипаЦеныНоменклатурыКонтрагента` CHAR, `Комментарий` CHAR, `owner` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_prices_types` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `price_currency` CHAR, `БазовыйТипЦен` CHAR, `Рассчитывается` BOOLEAN, `discount_percent` FLOAT, `vat_price_included` BOOLEAN, `ПорядокОкругления` CHAR, `ОкруглятьВБольшуюСторону` BOOLEAN, `Комментарий` CHAR, `СпособРасчетаЦены` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_charge_discounts_types` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `currency` CHAR, `ДляВсейНоменклатуры` BOOLEAN, `discount_percent` FLOAT, `ЗначениеУсловия` CHAR, `ЗначениеУсловия_T` CHAR, `ОбщееВремяНачала` Date, `ОбщееВремяОкончания` Date, `ОграничениеСкидкиНаценки` FLOAT, `condition` CHAR, `quality` CHAR, `ДляВсехПолучателей` BOOLEAN, `ПоДнямНедели` BOOLEAN, `ВидСкидки` CHAR, `ts_ВремяПоДнямНедели` JSON);\nCREATE TABLE IF NOT EXISTS `cat_cost_items` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `ВидЗатрат` CHAR, `СтатусМатериальныхЗатрат` CHAR, `ХарактерЗатрат` CHAR, `ВидРасходовНУ` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_cash_flow_articles` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `ВидДвиженияДенежныхСредств` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_stores` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `Комментарий` CHAR, `ТипЦенРозничнойТорговли` CHAR, `department` CHAR, `ВидСклада` CHAR, `НомерСекции` INT, `РасчетРозничныхЦенПоТорговойНаценке` BOOLEAN, `Карантин` BOOLEAN, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_serial_numbers` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `owner` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_series` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `СерийныйНомер` CHAR, `СрокГодности` Date, `НомерГТД` CHAR, `СтранаПроисхождения` CHAR, `ОсновноеИзображение` CHAR, `Комментарий` CHAR, `ТехническийНомер` CHAR, `ДатаИзготовления` Date, `department` CHAR, `ОжидаемоеКоличествоВыпуска` FLOAT, `ДатаЗапускаСерии` Date, `nom_characteristic` CHAR, `ЕдиницаМест` CHAR, `Изготовитель` CHAR, `ДатаИзготовленияСубстанции` Date, `МаршрутнаяКарта` CHAR, `ПроцентноеСодержание` FLOAT, `owner` CHAR, `ts_Спецификации` JSON);\nCREATE TABLE IF NOT EXISTS `cat_regions` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `Комментарий` CHAR, `КодРегиона` CHAR, `КодАдресногоЭлемента` INT, `ЖДСтанцияНазначения` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_projects` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `ДатаНачала` Date, `ДатаОкончания` Date, `Ответственный` CHAR, `Описание` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_orders_closing_reasons` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `cat_users` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `ФизЛицо` CHAR, `ИдентификаторПользователяИБ` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_divisions` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `ВидПодразделения` CHAR, `ВидЦФО` CHAR, `ОсновнойПроект` CHAR, `ОсновнойПроект_T` CHAR, `sequence` INT, `warehouse` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_organizations` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `prefix` CHAR, `ИНН` CHAR, `КПП` CHAR, `РегистрационныйНомерПФР` CHAR, `ГоловнаяОрганизация` CHAR, `НаименованиеПолное` CHAR, `КодПоОКПО` CHAR, `КодПоОКАТО` CHAR, `КодИМНС` CHAR, `РайонныйКоэффициент` FLOAT, `individual_legal` CHAR, `ТерриториальныеУсловияПФР` CHAR, `ОсновнойБанковскийСчет` CHAR, `ВидСтавокЕСНиПФР` CHAR, `НаименованиеПлательщикаПриПеречисленииНалогов` CHAR, `ИностраннаяОрганизация` BOOLEAN, `ДатаРегистрации` Date, `КодОКОПФ` CHAR, `НаименованиеОКОПФ` CHAR, `КодОКФС` CHAR, `НаименованиеОКФС` CHAR, `СвидетельствоСерияНомер` CHAR, `СвидетельствоДатаВыдачи` Date, `СвидетельствоНаименованиеОргана` CHAR, `СвидетельствоКодОргана` CHAR, `СтранаРегистрации` CHAR, `СтранаПостоянногоМестонахождения` CHAR, `КодВСтранеРегистрации` CHAR, `ОГРН` CHAR, `НаименованиеИнострОрганизации` CHAR, `РегистрационныйНомерФСС` CHAR, `НаименованиеИМНС` CHAR, `КодОКВЭД` CHAR, `НаименованиеОКВЭД` CHAR, `КодОКОНХ` CHAR, `ИндивидуальныйПредприниматель` CHAR, `ОбменКодАбонента` CHAR, `ОбменКаталогОтправкиДанныхОтчетности` CHAR, `ОбменКаталогПрограммыЭлектроннойПочты` CHAR, `РайонныйКоэффициентРФ` FLOAT, `ОтражатьВРегламентированномУчете` BOOLEAN, `КодИФНСПолучателя` CHAR, `НаименованиеТерриториальногоОрганаПФР` CHAR, `НаименованиеСокращенное` CHAR, `ВидОбменаСКонтролирующимиОрганами` CHAR, `УчетнаяЗаписьОбмена` CHAR, `КодОрганаПФР` CHAR, `КодОрганаФСГС` CHAR, `ДополнительныйКодФСС` CHAR, `КодПодчиненностиФСС` CHAR, `ЦифровойИндексОбособленногоПодразделения` INT, `РегистрационныйНомерТФОМС` CHAR, `ИПРегистрационныйНомерПФР` CHAR, `ИПРегистрационныйНомерФСС` CHAR, `ИПКодПодчиненностиФСС` CHAR, `ИПРегистрационныйНомерТФОМС` CHAR, `НаименованиеТерриториальногоОрганаФСС` CHAR, `КодПоОКТМО` CHAR, `Регион` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_gtd_numbers` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `Комментарий` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_groups` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `storage_unit` CHAR, `base_unit` CHAR, `vat_rate` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `Артикул` CHAR, `ВестиОперативныйУчетОстатковНЗП` BOOLEAN, `ВестиУчетПоСериям` BOOLEAN, `ВестиУчетПоСериямВНЗП` BOOLEAN, `ВестиУчетПоХарактеристикам` BOOLEAN, `ВидВоспроизводства` CHAR, `nom_kind` CHAR, `ЕдиницаДляОтчетов` CHAR, `storage_unit` CHAR, `base_unit` CHAR, `Набор` BOOLEAN, `НазначениеИспользования` CHAR, `vat_rate` CHAR, `Комментарий` CHAR, `Услуга` BOOLEAN, `nom_group` CHAR, `СтранаПроисхождения` CHAR, `НомерГТД` CHAR, `ТребуетсяВнешняяСертификация` BOOLEAN, `ТребуетсяВнутренняяСертификация` BOOLEAN, `cost_item` CHAR, `ВестиСерийныеНомера` BOOLEAN, `Комплект` BOOLEAN, `НаправлениеВыпуска` CHAR, `НаправлениеСписанияВыпущеннойПродукции` CHAR, `ПорядокПрисвоенияСерийногоНомера` CHAR, `price_group` CHAR, `ОКП` CHAR, `ЕдиницаИзмеренияМест` CHAR, `Производитель` CHAR, `Импортер` CHAR, `ПроцентСрокаГодности` INT, `ВремяПроверкиЗаказа` INT, `МинимальнаяПартияЗакупки` FLOAT, `ЦиклПоставкиДней` INT, `РегистрационныйНомер` CHAR, `ФормулаОсновногоДействующегоВещества` CHAR, `Дозировка` CHAR, `Упаковка` INT, `ЛекарственнаяФорма` CHAR, `ЖНВЛП` BOOLEAN, `Изготовитель` CHAR, `НаименованиеМеждународное` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_partners` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `НаименованиеПолное` CHAR, `Комментарий` CHAR, `ДополнительноеОписание` CHAR, `ГоловнойКонтрагент` CHAR, `КодПоОКПО` CHAR, `ИНН` CHAR, `КПП` CHAR, `individual_legal` CHAR, `ОсновнойБанковскийСчет` CHAR, `main_contract` CHAR, `ОсновнойВидДеятельности` CHAR, `ДокументУдостоверяющийЛичность` CHAR, `ОсновнойМенеджерПокупателя` CHAR, `Покупатель` BOOLEAN, `Поставщик` BOOLEAN, `ОсновноеКонтактноеЛицо` CHAR, `ОКОПФ` CHAR, `Регион` CHAR, `ГруппаДоступаКонтрагента` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_contact_persons_partners` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `Должность` CHAR, `Комментарий` CHAR, `КонтактноеЛицо` CHAR, `owner` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_contact_persons` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `Фамилия` CHAR, `Имя` CHAR, `Отчество` CHAR, `ДатаРождения` Date, `Описание` CHAR, `Пол` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_countries` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `НаименованиеПолное` CHAR, `КодАльфа2` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_units` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `НаименованиеПолное` CHAR, `МеждународноеСокращение` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_quality` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `cat_obj_categories` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `НазначениеКатегории` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_cashboxes` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `funds_currency` CHAR, `ПодразделениеОрганизации` CHAR, `owner` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_users_acl` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `prefix` CHAR, `owner` CHAR, `ts_acl_objs` JSON);\nCREATE TABLE IF NOT EXISTS `cat_meta_ids` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `ПорядокКоллекции` INT, `Имя` CHAR, `synonym` CHAR, `ПолноеИмя` CHAR, `ПолныйСиноним` CHAR, `БезДанных` BOOLEAN, `ЗначениеПустойСсылки` CHAR, `ЗначениеПустойСсылки_T` CHAR, `КлючОбъектаМетаданных` CHAR, `НоваяСсылка` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_property_values` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `owner` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_units` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `qualifier_unit` CHAR, `Вес` FLOAT, `Объем` FLOAT, `Коэффициент` FLOAT, `ПорогОкругления` INT, `ПредупреждатьОНецелыхМестах` BOOLEAN, `owner` CHAR, `owner_T` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_contracts` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `settlements_currency` CHAR, `ВедениеВзаиморасчетов` CHAR, `Комментарий` CHAR, `ДержатьРезервБезОплатыОграниченноеВремя` BOOLEAN, `ДопустимаяСуммаЗадолженности` FLOAT, `ДопустимоеЧислоДнейЗадолженности` INT, `organization` CHAR, `КонтролироватьСуммуЗадолженности` BOOLEAN, `КонтролироватьЧислоДнейЗадолженности` BOOLEAN, `ПроцентПредоплаты` FLOAT, `price_type` CHAR, `price_type_T` CHAR, `contract_kind` CHAR, `ЧислоДнейРезерваБезОплаты` INT, `date` Date, `number_doc` CHAR, `ОсновнойПроект` CHAR, `ОсновнойПроект_T` CHAR, `main_cash_flow_article` CHAR, `СрокДействия` Date, `НалоговыйАгентПоОплате` BOOLEAN, `УстановленСрокОплатыДляРезервовПоСомнительнымДолгам` BOOLEAN, `СрокОплатыДляРезервовПоСомнительнымДолгам` INT, `owner` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_kinds` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `nom_type` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_contact_information_kinds` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `type` CHAR, `ВидОбъектаКонтактнойИнформации` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_currencies` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `НаименованиеПолное` CHAR, `ПараметрыПрописиНаРусском` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_bank_accounts` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `НомерСчета` CHAR, `Банк` CHAR, `БанкДляРасчетов` CHAR, `ТекстКорреспондента` CHAR, `ТекстНазначения` CHAR, `ВидСчета` CHAR, `funds_currency` CHAR, `НомерИДатаРазрешения` CHAR, `ДатаОткрытия` Date, `ДатаЗакрытия` Date, `МесяцПрописью` BOOLEAN, `СуммаБезКопеек` BOOLEAN, `ОтдельныйСчетГОЗ` BOOLEAN, `ГосударственныйКонтракт` CHAR, `owner` CHAR, `owner_T` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_banks_qualifier` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `КоррСчет` CHAR, `Город` CHAR, `Адрес` CHAR, `Телефоны` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cch_properties` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `НазначениеСвойства` CHAR, `type` JSON);\nCREATE TABLE IF NOT EXISTS `cch_predefined_elmnts` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `value` CHAR, `value_T` CHAR, `Описание` CHAR, `synonym` CHAR, `Список` INT, `parent` CHAR, `type` CHAR, `ts_Элементы` JSON);\nCREATE TABLE IF NOT EXISTS `cch_destinations` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN, `parent` CHAR, `type` CHAR);\nCREATE TABLE IF NOT EXISTS `enm_individual_legal` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_users_types` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_nom_types` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_contact_information_types` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_vat_rates` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_obj_delivery_states` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_stores_kinds` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_contract_kinds` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_mutual_contract_settlements` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `enm_accumulation_record_type` (ref CHAR PRIMARY KEY NOT NULL, `_deleted` BOOLEAN, id CHAR, name CHAR, is_folder BOOLEAN);\n"});
/**
 * Главное окно интерфейса
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 */

// Назначим обработчики событий
$p.on({

	/**
	 * ### При установке параметров сеанса
	 * Процедура устанавливает параметры работы программы, специфичные для текущей сборки
	 *
	 * @param prm {Object} - в свойствах этого объекта определяем параметры работы программы
	 * @param modifiers {Array} - сюда можно добавить обработчики, переопределяющие функциональность объектов данных
	 */
	settings: function (prm, modifiers) {

		prm.__define({

			// разделитель для localStorage
			local_storage_prefix: {
				value: "oo_"
			},

			// скин по умолчанию
			skin: {
				value: "dhx_terrace"
			},

			// фильтр для репликации с CouchDB
			pouch_filter: {
				value: (function () {
					var filter = {};
					filter.__define({
						doc: {
							value: "auth/by_partner",
							writable: false
						}
					});
					return filter;
				})(),
				writable: false
			},

			// гостевые пользователи для демо-режима
			guests: {
				value: [{
					username: "Алгоритм",
					password: "hQI7OhIGlVeOWi8="
				}]
			},

			// если понадобится обратиться к 1С, будем использовать irest
			irest_enabled: {
				value: true
			},

			// расположение rest-сервиса 1c по умолчанию
			rest_path: {
				value: "/a/zd/%1/odata/standard.odata/"
			},

			// не шевелить hash url при открытии подчиненных форм
			keep_hash: {
				value: true
			},

			// логин гостевого пользователя couchdb
			guest_name: {
				value: "guest"
			},

			// пароль гостевого пользователя couchdb
			guest_pwd: {
				value: "meta"
			}

		});


		// по умолчанию, обращаемся к зоне 1
		prm.zone = 0;

		// объявляем номер демо-зоны
		prm.zone_demo = 1;

		// расположение couchdb
		prm.couch_path = "/couchdb/oo_";
		//prm.couchdb = "http://i980:5984/oo_";

		// разрешаем сохранение пароля
		prm.enable_save_pwd = true;

	},

	/**
	 * ### При инициализации интерфейса
	 * Вызывается после готовности DOM и установки параметров сеанса, до готовности метаданных
	 * В этом обработчике можно начать рисовать интерфейс, но обращаться к данным еще рановато
	 *
	 */
	iface_init: function() {

		// разделы интерфейса
		$p.iface.sidebar_items = [
			{id: "orders", text: "Заказы", icon: "projects_48.png"},
			{id: "settings", text: "Настройки", icon: "settings_48.png"},
			{id: "about", text: "О программе", icon: "about_48.png"}
		];

		// наблюдатель за событиями авторизации и синхронизации
		$p.iface.btn_auth_sync = new $p.iface.OBtnAuthSync();

		$p.iface.btns_nav = function (wrapper) {
			return $p.iface.btn_auth_sync.bind(new $p.iface.OTooolBar({
				wrapper: wrapper,
				class_name: 'md_otbnav',
				width: '260px', height: '28px', top: '3px', right: '3px', name: 'right',
				buttons: [
					{name: 'about', text: '<i class="fa fa-info-circle md-fa-lg"></i>', tooltip: 'О программе', float: 'right'},
					{name: 'settings', text: '<i class="fa fa-cog md-fa-lg"></i>', tooltip: 'Настройки', float: 'right'},
					{name: 'orders', text: '<i class="fa fa-suitcase md-fa-lg"></i>', tooltip: 'Заказы', float: 'right'},
					{name: 'sep_0', text: '', float: 'right'},
					{name: 'sync', text: '', float: 'right'},
					{name: 'auth', text: '', width: '80px', float: 'right'}

				], onclick: function (name) {
					$p.iface.main.cells(name).setActive(true);
					return false;
				}
			}))
		};

	},

	/**
	 * ### При готовности метаданных
	 */
	meta: function () {

		// гасим заставку
		document.body.removeChild(document.querySelector("#osplash"));

		// основной сайдбар
		$p.iface.main = new dhtmlXSideBar({
			parent: document.body,
			icons_path: "dist/imgs/",
			width: 180,
			header: true,
			template: "tiles",
			autohide: true,
			items: $p.iface.sidebar_items,
			offsets: {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0
			}
		});

		// подписываемся на событие навигации по сайдбару
		$p.iface.main.attachEvent("onSelect", function(id){

			var hprm = $p.job_prm.parse_url();
			if(hprm.view != id)
				$p.iface.set_hash(hprm.obj, hprm.ref, hprm.frm, id);

			$p.iface["view_" + id]($p.iface.main.cells(id));

		});

		// включаем индикатор загрузки
		$p.iface.main.progressOn();

		// активируем страницу
		hprm = $p.job_prm.parse_url();
		if(!hprm.view || $p.iface.main.getAllItems().indexOf(hprm.view) == -1){
			$p.iface.set_hash(hprm.obj, hprm.ref, hprm.frm, "orders");
		} else
			setTimeout($p.iface.hash_route);

	},

	/**
	 * ### Обработчик маршрутизации
	 */
	hash_route: function (hprm) {

		// view отвечает за переключение закладки в SideBar
		if(hprm.view && $p.iface.main.getActiveItem() != hprm.view){
			$p.iface.main.getAllItems().forEach(function(item){
				if(item == hprm.view)
					$p.iface.main.cells(item).setActive(true);
			});
		}

		return false;
	},

	/**
	 * ### При окончании загрузки локальных данных
	 */
	predefined_elmnts_inited: function predefined_elmnts_inited() {

		$p.iface.main.progressOff();
		$p.off(predefined_elmnts_inited);

		// если разрешено сохранение пароля - сразу пытаемся залогиниться
		if(!$p.wsql.pouch.authorized && navigator.onLine &&
			$p.wsql.get_user_param("enable_save_pwd") &&
			$p.wsql.get_user_param("user_name") &&
			$p.wsql.get_user_param("user_pwd")){

			setTimeout(function () {
				$p.iface.frm_auth({
					modal_dialog: true,
					try_auto: true
				});
			}, 100);
		}

	},

	/**
	 * ### Обработчик ошибки загрузки локальных данных
	 * @param err
	 */
	pouch_load_data_error: function pouch_load_data_error(err) {

		// если это первый запуск, показываем диалог авторизации
		if(err.db_name && err.hasOwnProperty("doc_count") && err.doc_count < 10 && navigator.onLine){

			// если это демо (zone === zone_demo), устанавливаем логин и пароль
			if($p.wsql.get_user_param("zone") == $p.job_prm.zone_demo && !$p.wsql.get_user_param("user_name")){
				$p.wsql.set_user_param("enable_save_pwd", true);
				$p.wsql.set_user_param("user_name", $p.job_prm.guests[0].username);
				$p.wsql.set_user_param("user_pwd", $p.job_prm.guests[0].password);

				setTimeout(function () {
					$p.iface.frm_auth({
						modal_dialog: true,
						try_auto: true
					});
				}, 100);

			}else{
				$p.iface.frm_auth({
					modal_dialog: true,
					try_auto: $p.wsql.get_user_param("zone") == $p.job_prm.zone_demo && $p.wsql.get_user_param("enable_save_pwd")
				});
			}

		}

		$p.iface.main.progressOff();
		$p.off(pouch_load_data_error);

	}
});

/**
 * ### Раздел интерфейса _О программе_
 * Информация о приложении и используемых библиотеках
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 */

$p.iface.view_about = function (cell) {

	function OViewAbout(){

		cell.attachHTMLString($p.injected_data['view_about.html']);
		cell.cell.querySelector(".dhx_cell_cont_sidebar").style.overflow = "auto";

		this.tb_nav = $p.iface.btns_nav(cell.cell.querySelector(".dhx_cell_sidebar_hdr"));
	}

	return $p.iface._about || ($p.iface._about = new OViewAbout());

};

/**
 * ### Раздел интерфейса _Заказы_
 * Содержит карусель с двумя страницами: list и doc
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 */

$p.iface.view_orders = function (cell) {

	function OViewOrders(){

		var t = this;

		// показывает форму списка
		function show_list(){
			
			t.carousel.cells("list").setActive();
			cell.setText({text: "Заказы"});

			if(!t.list){
				t.carousel.cells("list").detachObject(true);
				t.list = $p.doc.buyers_order.form_list(t.carousel.cells("list"));
			}

		}

		// показывает форму заказа
		function show_doc(ref){

			var _cell = t.carousel.cells("doc");

			_cell.setActive();

			if(!_cell.ref || _cell.ref != ref)

				$p.doc.buyers_order.form_obj(_cell, {
						ref: ref,
						bind_pwnd: true,
						on_close: function () {
							setTimeout(function () {
								$p.iface.set_hash(undefined, "", "list");
							});
						},
						set_text: function (text) {
							if(t.carousel.getActiveCell() == _cell)
								cell.setText({text: "<b>" + text + "</b>"});
						}
					})
					.then(function (wnd) {
						t.doc = wnd;
						setTimeout(t.doc.wnd.set_text.bind(t.doc.wnd, true), 200);
					});

			else if(t.doc && t.doc.wnd){
				setTimeout(t.doc.wnd.set_text.bind(t.doc.wnd, true), 200);
			}

		}

		// обработчик маршрутизации url
		function hash_route(hprm) {

			if(hprm.view == "orders"){

				if(hprm.obj == "doc.buyers_order" && !$p.utils.is_empty_guid(hprm.ref)){

					if(hprm.frm != "doc")
						setTimeout(function () {
							$p.iface.set_hash(undefined, undefined, "doc");
						});
					else
						show_doc(hprm.ref);


				} else{

					if(hprm.obj != "doc.buyers_order")
						setTimeout(function () {
							$p.iface.set_hash("doc.buyers_order", "", "list");
						});
					else
						show_list();
				}

				return false;
			}

			return true;

		}

		// cюда попадаем после всех приготовлений - можно рисовать форму заказов
		function go_go(){

			$p.off(go_go);

			setTimeout(function () {
				$p.iface.set_hash($p.job_prm.parse_url().obj || "doc.buyers_order");
			});
		}

		// Рисуем дополнительные элементы навигации
		t.tb_nav = $p.iface.btns_nav(cell.cell.querySelector(".dhx_cell_sidebar_hdr"));

		// Создаём страницы карусели
		t.carousel = cell.attachCarousel({
			keys:           false,
			touch_scroll:   false,
			offset_left:    0,
			offset_top:     0,
			offset_item:    0
		});
		t.carousel.hideControls();
		t.carousel.addCell("list");
		t.carousel.addCell("doc");


		// Дожидаемся инициализации констант
		if($p.job_prm.properties)
			setTimeout(go_go);
		else
			$p.on({ predefined_elmnts_inited: go_go });


		/**
		 * Обработчик маршрутизации
		 * @param hprm
		 * @return {boolean}
		 */
		$p.on("hash_route", hash_route);

	}

	return $p.iface._orders || ($p.iface._orders = new OViewOrders());

};

/**
 * ### Раздел интерфейса _Настройки_
 * Закладки основных и дополнительных настроек
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 */

$p.iface.view_settings = function (cell) {

	function OViewSettings(){

		var t = this;
		
		t.tb_nav = $p.iface.btns_nav(cell.cell.querySelector(".dhx_cell_sidebar_hdr"));

		// разделы настроек
		t.tabs = cell.attachTabbar({
			arrows_mode:    "auto",
			tabs: [
				{id: "const", text: '<i class="fa fa-key"></i> Общее', active: true}
			]
		});

		// обработчик при смене закладки
		t.tabs.attachEvent("onSelect", function(id){
			if(t[id] && t[id].tree && t[id].tree.getSelectedItemId()){
				t[id].tree.callEvent("onSelect", [t[id].tree.getSelectedItemId()]);
			}
			return true;
		});

		// закладка основных настроек
		t.tabs.cells("const").attachHTMLString($p.injected_data['view_settings.html']);
		t.const = t.tabs.cells("const").cell.querySelector(".dhx_cell_cont_tabbar");
		t.const.style.overflow = "auto";

		// первая колонка настроек
		(function (cont) {


			t.form1 = new dhtmlXForm(cont, [

					{ type:"settings", labelWidth:80, position:"label-left"  },

					{type: "label", labelWidth:320, label: "Адрес CouchDB", className: "label_options"},
					{type:"input" , inputWidth: 220, name:"couch_path", label:"Путь:", validate:"NotEmpty"},
					{type:"template", label:"",value:"",
						note: {text: "Можно указать как относительный, так и абсолютный URL публикации CouchDB", width: 320}},

					{type: "label", labelWidth:320, label: "Значение разделителя данных", className: "label_options"},
					{type:"input" , inputWidth: 220, name:"zone", label:"Зона:", numberFormat: ["0", "", ""], validate:"NotEmpty,ValidInteger"},
					{type:"template", label:"",value:"", note: {text: "Для неразделенной публикации, зона = 0", width: 320}},

					{type: "label", labelWidth:320, label: "Суффикс базы пользователя", className: "label_options"},
					{type:"input" , inputWidth: 220, name:"couch_suffix", label:"Суффикс:"},
					{type:"template", label:"",value:"",
						note: {text: "Назначается дилеру при регистрации", width: 320}},

					{type: "label", labelWidth:320, label: "Сохранять пароль пользователя", className: "label_options"},
					{type:"checkbox", name:"enable_save_pwd", label:"Разрешить:", checked: $p.wsql.get_user_param("enable_save_pwd", "boolean")},
					{type:"template", label:"",value:"", note: {text: "Не рекомендуется, если к компьютеру имеют доступ посторонние лица", width: 320}},
					{type:"template", label:"",value:"", note: {text: "", width: 320}},

					{ type:"block", blockOffset: 0, name:"block_buttons", list:[
						{type: "button", name: "save", value: "<i class='fa fa-floppy-o fa-lg'></i>", tooltip: "Применить настройки и перезагрузить программу"},
						{type:"newcolumn"},
						{type: "button", offsetLeft: 20, name: "reset", value: "<i class='fa fa-refresh fa-lg'></i>", tooltip: "Стереть справочники и перезаполнить данными сервера"}
					]  }

				]
			);
			t.form1.cont.style.fontSize = "100%";

			// инициализация свойств
			["zone", "couch_path", "couch_suffix"].forEach(function (prm) {
				if(prm == "zone")
					t.form1.setItemValue(prm, $p.wsql.get_user_param(prm));
				else
					t.form1.setItemValue(prm, $p.wsql.get_user_param(prm) || $p.job_prm[prm]);
			});

			t.form1.attachEvent("onChange", function (name, value, state){
				$p.wsql.set_user_param(name, name == "enable_save_pwd" ? state || "" : value);
			});

			t.form1.attachEvent("onButtonClick", function(name){

				if(name == "save"){

					// завершаем синхронизацию
					$p.wsql.pouch.log_out();

					// перезагружаем страницу
					setTimeout(function () {
						$p.eve.redirect = true;
						location.reload(true);
					}, 1000);

				} else if(name == "reset"){

					dhtmlx.confirm({
						title: "Сброс данных",
						text: "Стереть справочники и перезаполнить данными сервера?",
						cancel: $p.msg.cancel,
						callback: function(btn) {
							if(btn)
								$p.wsql.pouch.reset_local_data();
						}
					});
				}
			});

		})(t.const.querySelector("[name=form1]").firstChild);

		// вторая колонка настроек
		(function (cont) {
			t.form2 = new dhtmlXForm(cont, [
				{ type:"settings", labelWidth:320, position:"label-left"  },

				{type: "label", label: "Тип устройства", className: "label_options"},
				{ type:"block", blockOffset: 0, name:"block_device_type", list:[
					{ type:"settings", labelAlign:"left", position:"label-right"  },
					{ type:"radio" , name:"device_type", labelWidth:120, label:'<i class="fa fa-desktop"></i> Компьютер', value:"desktop"},
					{ type:"newcolumn"   },
					{ type:"radio" , name:"device_type", labelWidth:150, label:'<i class="fa fa-mobile fa-lg"></i> Телефон, планшет', value:"phone"}
				]  },
				{type:"template", label:"",value:"", note: {text: "Класс устройства определяется автоматически, но пользователь может задать его явно", width: 320}},

				//{type: "label", labelWidth:320, label: "Адрес http сервиса 1С", className: "label_options"},
				//{type:"input" , inputWidth: 220, name:"rest_path", label:"Путь", validate:"NotEmpty"},
				//{type:"template", label:"",value:"",
				//	note: {text: "Можно указать как относительный, так и абсолютный URL публикации 1С OData. " +
				//	"О настройке кроссдоменных запросов к 1С <a href='#'>см. здесь</a>", width: 320}},

				{type: "label", label: "Подключаемые модули", className: "label_options"},
				{type:"input" , position:"label-top", inputWidth: 320, name:"modifiers", label:"Модификаторы:", value: $p.wsql.get_user_param("modifiers"), rows: 3, style:"height:80px;"},
				{type:"template", label:"",value:"", note: {text: "Список дополнительных модулей", width: 320}}

			]);

			t.form2.cont.style.fontSize = "100%";

			// инициализация свойств
			t.form2.checkItem("device_type", $p.job_prm.device_type);

			t.form2.disableItem("modifiers");

			// подключаем обработчик изменения значений в форме
			t.form2.attachEvent("onChange", function (name, value, state){
				$p.wsql.set_user_param(name, value);

			});

			t.form2.getInput("modifiers").onchange = function () {
				$p.wsql.set_user_param("modifiers", this.value);
			};

		})(t.const.querySelector("[name=form2]").firstChild);

	}

	return $p.iface._settings || ($p.iface._settings = new OViewSettings());

};

return undefined;
}));
